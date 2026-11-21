import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, Play, RotateCcw } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { CORE_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  COLUMN_X,
  RAMPART_SLUG,
  RAMPART_WAVES,
  WORLD_H,
  WORLD_W,
  canDrop,
  canPlace,
  createSiege,
  dropBoulder,
  loadWaveBests,
  placeBlock,
  saveWaveBest,
  siegeEndsAt,
  startSiege,
  stepSiege,
  totalBest,
  waveScore,
  waveStars,
  type BlockKind,
  type Siege,
} from "../../lib/games/rampart-keeper";
import { drawScene } from "../../lib/games/rampart-keeper-draw";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  wave: string; era: string[]; budget: string; boulders: string; gate: string; horn: string;
  plank: string; stone: string; beam: string; start: string; buildHint: string; siegeHint: string;
  won: string; lost: string; next: string; retry: string; finale: string; score: string; best: string;
  waves: string; full: string; exitFull: string; mute: string; unmute: string; intro: string; reset: string;
}> = {
  ko: {
    wave: "{0}웨이브", era: ["산성의 새벽", "토성의 노을", "읍성의 밤"], budget: "자재 {0}", boulders: "바위 {0}", gate: "성문 {0}", horn: "버티기 {0}초",
    plank: "나무 1", stone: "돌 2", beam: "들보 2", start: "공격 시작", buildHint: "자재를 고르고 성문 앞 칸을 눌러 쌓으세요.", siegeHint: "화면을 눌러 그 자리에 바위를 떨어뜨리세요.",
    won: "성문을 지켰어요!", lost: "성문이 뚫렸어요", next: "다음 웨이브", retry: "다시 하기", finale: "30웨이브를 모두 지켰어요! 1웨이브부터 다시",
    score: "점수 {0}", best: "최고 합계 {0}", waves: "웨이브 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    intro: "적은 오른쪽에서 몰려와 쌓은 블록을 밀고 부숩니다. 넘어지거나 바위에 맞으면 끝. 뿔나팔이 울릴 때까지 성문을 지키세요.", reset: "다시 쌓기",
  },
  en: {
    wave: "Wave {0}", era: ["Fortress dawn", "Rampart dusk", "Walled town night"], budget: "Materials {0}", boulders: "Boulders {0}", gate: "Gate {0}", horn: "Hold {0}s",
    plank: "Plank 1", stone: "Stone 2", beam: "Beam 2", start: "Start the siege", buildHint: "Pick a material and tap a slot in front of the gate to stack it.", siegeHint: "Tap anywhere to drop a boulder there.",
    won: "The gate held!", lost: "The gate fell", next: "Next wave", retry: "Try again", finale: "All 30 waves held! Start again from wave 1",
    score: "Score {0}", best: "Best total {0}", waves: "Pick a wave", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    intro: "Invaders march in from the right and push and hack at your blocks. They are out when they topple or a boulder hits them. Hold the gate until the horn sounds.", reset: "Rebuild",
  },
  ja: {
    wave: "ウェーブ{0}", era: ["山城の夜明け", "土塁の夕焼け", "城下町の夜"], budget: "資材 {0}", boulders: "岩 {0}", gate: "城門 {0}", horn: "あと{0}秒",
    plank: "木材 1", stone: "石 2", beam: "梁 2", start: "攻撃開始", buildHint: "資材を選び、城門の前のマスを押して積みます。", siegeHint: "画面を押すとその場所に岩を落とします。",
    won: "城門を守った！", lost: "城門が破られた", next: "次のウェーブ", retry: "もう一度", finale: "30ウェーブすべて守りました！ウェーブ1から再開",
    score: "得点 {0}", best: "最高合計 {0}", waves: "ウェーブを選ぶ", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    intro: "敵は右から押し寄せ、積んだブロックを押して壊します。倒れるか岩が当たれば退場。角笛が鳴るまで城門を守りましょう。", reset: "積み直す",
  },
  zh: {
    wave: "第{0}波", era: ["山城黎明", "土墙黄昏", "城镇之夜"], budget: "材料 {0}", boulders: "巨石 {0}", gate: "城门 {0}", horn: "坚守 {0}秒",
    plank: "木块 1", stone: "石块 2", beam: "横梁 2", start: "开始攻城", buildHint: "选好材料，点城门前的格子把它堆上去。", siegeHint: "点击画面，在那里砸下巨石。",
    won: "城门守住了！", lost: "城门被攻破", next: "下一波", retry: "再来一次", finale: "30波全部守住！从第1波重新开始",
    score: "得分 {0}", best: "最佳合计 {0}", waves: "选择波次", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    intro: "敌人从右边涌来，推挤并砍坏你堆的方块。被推倒或被巨石砸中就出局。坚守城门直到号角响起。", reset: "重新堆",
  },
  fr: {
    wave: "Vague {0}", era: ["Aube sur la forteresse", "Crépuscule sur le rempart", "Nuit sur la ville close"], budget: "Matériaux {0}", boulders: "Rochers {0}", gate: "Porte {0}", horn: "Tenir {0} s",
    plank: "Planche 1", stone: "Pierre 2", beam: "Poutre 2", start: "Lancer l'assaut", buildHint: "Choisissez un matériau et touchez une case devant la porte pour l'empiler.", siegeHint: "Touchez l'écran pour lâcher un rocher à cet endroit.",
    won: "La porte a tenu !", lost: "La porte est tombée", next: "Vague suivante", retry: "Réessayer", finale: "Les 30 vagues tenues ! Recommencer à la vague 1",
    score: "Score {0}", best: "Meilleur total {0}", waves: "Choisir une vague", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    intro: "Les assaillants arrivent par la droite, poussent et frappent vos blocs. Ils sont hors jeu s'ils basculent ou si un rocher les touche. Tenez la porte jusqu'au cor.", reset: "Reconstruire",
  },
  es: {
    wave: "Oleada {0}", era: ["Amanecer en la fortaleza", "Atardecer en la muralla", "Noche en la villa amurallada"], budget: "Materiales {0}", boulders: "Rocas {0}", gate: "Puerta {0}", horn: "Aguanta {0} s",
    plank: "Tabla 1", stone: "Piedra 2", beam: "Viga 2", start: "Empezar el asedio", buildHint: "Elige un material y toca una casilla delante de la puerta para apilarlo.", siegeHint: "Toca la pantalla para soltar una roca ahí.",
    won: "¡La puerta aguantó!", lost: "Cayó la puerta", next: "Siguiente oleada", retry: "Reintentar", finale: "¡Las 30 oleadas aguantadas! Empezar de nuevo en la 1",
    score: "Puntos {0}", best: "Mejor total {0}", waves: "Elegir oleada", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    intro: "Los invasores llegan por la derecha y empujan y golpean tus bloques. Quedan fuera si vuelcan o les cae una roca. Aguanta la puerta hasta que suene el cuerno.", reset: "Reconstruir",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:rampart-keeper:muted";
const KINDS: BlockKind[] = ["plank", "stone", "beam"];

export default function RampartKeeper({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [wave, setWave] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [bests, setBests] = useState<Record<number, number>>({});
  const [kind, setKind] = useState<BlockKind>("stone");
  const [muted, setMuted] = useState(false);
  const [, setTick] = useState(0);
  const siege = useRef<Siege>(createSiege(0));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const aim = useRef<number | null>(null);
  const hoverColumn = useRef<number | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const knockedSeen = useRef(0);

  const s = siege.current;
  const ended = s.phase === "won" || s.phase === "lost";
  useRunRecord(RAMPART_SLUG, ended, waveScore(s));

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((w: number) => {
    siege.current = createSiege(w);
    knockedSeen.current = 0;
    setWave(w);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(RAMPART_SLUG, RAMPART_WAVES);
    setCleared(done);
    setBests(loadWaveBests());
    load(nextOpenStage(done, RAMPART_WAVES));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  // Fixed-step loop: physics at 60 Hz, HUD refresh every few frames.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    const loop = (now: number) => {
      const cur = siege.current;
      acc += Math.min(100, now - last);
      last = now;
      while (cur.phase === "siege" && acc >= 1000 / 60) {
        const before = cur.phase;
        stepSiege(cur);
        acc -= 1000 / 60;
        if (cur.knocked > knockedSeen.current) {
          knockedSeen.current = cur.knocked;
          sfx("combo");
        }
        if (before === "siege" && cur.phase !== "siege") {
          if (cur.phase === "won") {
            setCleared(markStageCleared(RAMPART_SLUG, cur.plan.wave, RAMPART_WAVES));
            setBests(saveWaveBest(cur.plan.wave, waveScore(cur)));
            sfx("win");
          } else sfx("lose");
          setTick((t) => t + 1);
        }
      }
      if (cur.phase !== "siege") acc = 0;
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawScene(ctx, cur, { aimX: aim.current, column: hoverColumn.current, now });
      if (++frame % 6 === 0) setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const toWorld = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * WORLD_W, y: ((e.clientY - rect.top) / rect.height) * WORLD_H };
  };
  const nearestColumn = (x: number): number | null => {
    let best = -1;
    let dist = Infinity;
    COLUMN_X.forEach((cx, i) => {
      const d = Math.abs(cx - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return dist <= 30 ? best : null;
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x } = toWorld(e);
    aim.current = siege.current.phase === "siege" ? x : null;
    hoverColumn.current = siege.current.phase === "build" ? nearestColumn(x) : null;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cur = siege.current;
    const { x } = toWorld(e);
    if (cur.phase === "build") {
      const col = nearestColumn(x);
      if (col !== null && placeBlock(cur, kind, col)) sfx("place");
      else sfx("fail");
      setTick((t) => t + 1);
    } else if (cur.phase === "siege") {
      aim.current = x;
      if (dropBoulder(cur, x)) sfx("tap");
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const hold = Math.max(0, Math.ceil((siegeEndsAt(s.plan) - s.time) / 1000));
  const stars = waveStars(s);
  const total = totalBest(bests);

  return (
    <div
      ref={containerRef}
      data-game="rampart-keeper"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-2" : "mx-auto w-full max-w-4xl space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{fill(c.wave, wave + 1)} / {RAMPART_WAVES}</Badge>
        <Badge variant="outline">{c.era[s.plan.era]}</Badge>
        <Badge variant={s.gateHp < 40 ? "destructive" : "outline"}>{fill(c.gate, Math.ceil(s.gateHp))}</Badge>
        {s.phase === "build" && <Badge variant="outline">{fill(c.budget, s.budgetLeft)}</Badge>}
        {s.phase === "siege" && <Badge variant={canDrop(s) ? "default" : "outline"}>{fill(c.boulders, s.bouldersLeft)}</Badge>}
        {s.phase === "siege" && <Badge variant="outline">{fill(c.horn, hold)}</Badge>}
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

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={WORLD_W}
          height={WORLD_H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerLeave={() => { aim.current = null; hoverColumn.current = null; }}
          className="aspect-video w-full touch-none select-none rounded-xl border border-border bg-card"
          aria-label={s.phase === "build" ? c.buildHint : c.siegeHint}
        />
        {ended && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/80 p-4 text-center backdrop-blur-xs">
            <p className="text-2xl font-black">{s.phase === "won" ? c.won : c.lost}</p>
            {s.phase === "won" && <p className="text-xl text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>}
            <p className="text-sm tabular-nums">{fill(c.score, waveScore(s))}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => load(wave)}>
                <RotateCcw className="size-4" />
                {c.retry}
              </Button>
              {s.phase === "won" && (
                <Button className="min-h-12" onClick={() => load(wave >= RAMPART_WAVES - 1 ? 0 : wave + 1)}>
                  {wave >= RAMPART_WAVES - 1 ? c.finale : c.next}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {s.phase === "build" && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{wave === 0 ? c.intro : c.buildHint}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {KINDS.map((k) => (
              <Button key={k} variant={kind === k ? "default" : "outline"} className="min-h-12" disabled={!canPlace(s, k)} onClick={() => { setKind(k); sfx("tap"); }}>
                {c[k]}
              </Button>
            ))}
            <Button variant="outline" className="min-h-12" onClick={() => load(wave)}>
              <RotateCcw className="size-4" />
              {c.reset}
            </Button>
            <Button className="col-span-3 min-h-12 sm:col-span-1" onClick={() => { startSiege(siege.current); sfx("success"); setTick((t) => t + 1); }}>
              <Play className="size-4" />
              {c.start}
            </Button>
          </div>
        </div>
      )}
      {s.phase === "siege" && <p className="text-sm text-muted-foreground">{c.siegeHint}</p>}

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.waves}</summary>
        <div className="pt-2">
          <StageBar count={RAMPART_WAVES} current={wave} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
