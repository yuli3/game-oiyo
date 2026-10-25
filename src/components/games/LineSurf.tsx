// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). The stroke is four buttons, not a freehand line.
// Curvature and a cut change speed. The fuse is play time, so reduced motion
// does not skip it.

import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, Share2, Check } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import { createHaptics } from "../../lib/games/haptics";
import { LINE_SURF_SPRITES } from "../../lib/games/sprites";
import {
  ACTS,
  GAME_ID,
  LANES,
  LIP_SPEED,
  STEPS,
  begin,
  createPuzzle,
  createRun,
  expire,
  freshSeed,
  ride,
  sprayCell,
  surfCue,
  surfOffer,
  type Act,
  type Run,
  type SurfAugmentId,
  type SurfCue,
} from "../../lib/games/line-surf";

const FUSE_MS = 2800;
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const BUTTON = "min-h-16 rounded-xl border border-border bg-card text-sm font-bold text-foreground transition-transform motion-reduce:transition-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  act: Record<Act, string>;
  speed: (n: number) => string;
  won: string;
  lost: string;
  enter: string;
  practice: string;
  practiceNote: string;
  pause: string;
  resume: string;
  leave: string;
  help: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  left: (n: number) => string;
  wall: string;
  lip: string;
  open: string;
  pick: string;
  augment: Record<SurfAugmentId, { name: string; body: string }>;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "파도 서퍼",
    subtitle: "한 획이 트랙입니다. 굽히면 속도가 줄고, 끊으면 속도가 비고, 곧게 가면 속도가 붙습니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "벽은 막고, 물마루는 속도가 있어야 넘습니다. 박을 넘기면 낙오합니다.",
    play: "다음 칸으로 획을 잇세요.",
    start: "시작",
    act: { straight: "곧게", left: "왼쪽", right: "오른쪽", cut: "끊기" },
    speed: (n) => `속도 ${n}`,
    won: "물마루까지 속도가 남았습니다.",
    lost: "속도가 모자라거나, 획이 벽을 만났습니다.",
    enter: "입장하기",
    practice: "연습 파도",
    practiceNote: "오늘의 판이 아닌 새 파도입니다.",
    pause: "멈추기",
    resume: "계속",
    leave: "나가기",
    help: "설명",
    best: (n) => `가장 빠른 마침 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    left: (n) => `남은 박 ${n}`,
    wall: "벽",
    lip: "물마루",
    open: "빈 칸",
    pick: "증강 하나를 고르세요.",
    augment: {
      glide: { name: "미끄러짐", body: "굽혀도 속도가 줄지 않습니다." },
      softCut: { name: "얕은 끊기", body: "끊어도 속도 1이 남습니다." },
      tailwind: { name: "뒷바람", body: "곧게 가면 속도가 둘 오릅니다." },
      floor: { name: "잔물", body: "속도 1에서는 굽혀도 더 줄지 않습니다." },
      lowLip: { name: "낮은 물마루", body: "속도 1로도 물마루를 넘습니다." },
      skim: { name: "스침", body: "벽 하나를 빈 칸처럼 지나갑니다." },
      pocket: { name: "주머니", body: "판 밖으로 나가는 굽힘을 한 번 막아 그 칸에 남습니다." },
      headStart: { name: "앞당김", body: "속도 3으로 시작합니다." },
    },
  },
  en: {
    title: "Line Surf",
    subtitle: "One stroke is the track. A curve spends speed, a cut empties it, and a straight line adds it.",
    preparing: "Preparing the round.",
    ready: "A wall stops you. A lip needs speed. Missing the beat drops you.",
    play: "Add the next segment.",
    start: "Start",
    act: { straight: "Straight", left: "Left", right: "Right", cut: "Cut" },
    speed: (n) => `Speed ${n}`,
    won: "Speed was left at the end of the line.",
    lost: "Not enough speed, or the stroke met a wall.",
    enter: "Enter",
    practice: "Practice wave",
    practiceNote: "A new wave, not today's board.",
    pause: "Pause",
    resume: "Continue",
    leave: "Leave",
    help: "Help",
    best: (n) => `Best finish ${n}`,
    record: (wins, losses) => `Ridden ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    left: (n) => `Time ${n}`,
    wall: "wall",
    lip: "lip",
    open: "open",
    pick: "Pick one augment.",
    augment: {
      glide: { name: "Glide", body: "A curve keeps your speed." },
      softCut: { name: "Soft cut", body: "A cut leaves speed 1." },
      tailwind: { name: "Tailwind", body: "A straight line adds two speed." },
      floor: { name: "Low water", body: "At speed 1, a curve does not drop you." },
      lowLip: { name: "Low lip", body: "Speed 1 clears a lip." },
      skim: { name: "Skim", body: "The first wall you meet is open." },
      pocket: { name: "Pocket", body: "The first curve off the side stays in the lane." },
      headStart: { name: "Head start", body: "You begin at speed 3." },
    },
  },
  ja: {
    title: "ラインサーフ",
    subtitle: "一画がトラックです。曲げると速度が減り、切ると速度が空になり、まっすぐだと速度が足されます。",
    preparing: "盤面を準備しています。",
    ready: "壁は止め、波頭は速度がないと越えられません。拍を外すと脱落します。",
    play: "次のマスへ画を足してください。",
    start: "開始",
    act: { straight: "まっすぐ", left: "左", right: "右", cut: "切る" },
    speed: (n) => `速度 ${n}`,
    won: "線の終わりに速度が残っていました。",
    lost: "速度が足りないか、画が壁に当たりました。",
    enter: "入る",
    practice: "練習の波",
    practiceNote: "今日の盤面ではない、新しい波です。",
    pause: "止める",
    resume: "続ける",
    leave: "出る",
    help: "説明",
    best: (n) => `いちばん速い終わり ${n}`,
    record: (wins, losses) => `乗った ${wins} · 落ちた ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    left: (n) => `残り ${n}`,
    wall: "壁",
    lip: "波頭",
    open: "空き",
    pick: "オーグメントを一つ選んでください。",
    augment: {
      glide: { name: "滑走", body: "曲げても速度は減りません。" },
      softCut: { name: "浅い切り", body: "切っても速度1が残ります。" },
      tailwind: { name: "追い風", body: "まっすぐで速度が2上がります。" },
      floor: { name: "残波", body: "速度1では曲げてもそれ以上減りません。" },
      lowLip: { name: "低い波頭", body: "速度1でも波頭を越えます。" },
      skim: { name: "かすめ", body: "壁を一つ、空きとして通ります。" },
      pocket: { name: "ポケット", body: "外へ出る曲げを一度だけ止め、そのマスに残ります。" },
      headStart: { name: "先行", body: "速度3で始まります。" },
    },
  },
  zh: {
    title: "划线冲浪",
    subtitle: "一笔就是轨道。转弯会掉速度，断开会把速度清掉，直行会加速。",
    preparing: "正在准备这一局。",
    ready: "墙会挡住。浪头需要速度。错过这一拍就会落下。",
    play: "把下一格接上。",
    start: "开始",
    act: { straight: "直行", left: "向左", right: "向右", cut: "断开" },
    speed: (n) => `速度 ${n}`,
    won: "线的尽头还留着速度。",
    lost: "速度不够，或者这一笔碰到了墙。",
    enter: "进入",
    practice: "练习浪",
    practiceNote: "这是新的浪，不是今天的局。",
    pause: "暂停",
    resume: "继续",
    leave: "离开",
    help: "说明",
    best: (n) => `最快的结束 ${n}`,
    record: (wins, losses) => `冲过 ${wins} · 落下 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    left: (n) => `剩余 ${n}`,
    wall: "墙",
    lip: "浪头",
    open: "空",
    pick: "选一个强化。",
    augment: {
      glide: { name: "滑行", body: "转弯也不掉速度。" },
      softCut: { name: "浅断开", body: "断开后还留速度1。" },
      tailwind: { name: "顺风", body: "直行速度加二。" },
      floor: { name: "余波", body: "速度为1时，转弯不再降低。" },
      lowLip: { name: "低浪头", body: "速度1也能过浪头。" },
      skim: { name: "掠过", body: "遇到的第一面墙当作空格。" },
      pocket: { name: "兜住", body: "第一次要滑出界的转弯留在原格。" },
      headStart: { name: "抢先", body: "以速度3开始。" },
    },
  },
  fr: {
    title: "Surf de ligne",
    subtitle: "Un trait est la piste. Une courbe dépense la vitesse, une coupe la vide, une ligne droite l'ajoute.",
    preparing: "Préparation de la manche.",
    ready: "Un mur arrête. Une crête demande de la vitesse. Rater le temps fait tomber.",
    play: "Ajoutez le segment suivant.",
    start: "Commencer",
    act: { straight: "Droit", left: "Gauche", right: "Droite", cut: "Couper" },
    speed: (n) => `Vitesse ${n}`,
    won: "Il restait de la vitesse au bout du trait.",
    lost: "Pas assez de vitesse, ou le trait a touché un mur.",
    enter: "Entrer",
    practice: "Vague d'essai",
    practiceNote: "Une vague nouvelle, pas la manche du jour.",
    pause: "Pause",
    resume: "Continuer",
    leave: "Sortir",
    help: "Aide",
    best: (n) => `Meilleure fin ${n}`,
    record: (wins, losses) => `Réussis ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    left: (n) => `Temps ${n}`,
    wall: "mur",
    lip: "crête",
    open: "vide",
    pick: "Choisissez un modificateur.",
    augment: {
      glide: { name: "Glisse", body: "Une courbe garde la vitesse." },
      softCut: { name: "Coupe douce", body: "Une coupe laisse la vitesse 1." },
      tailwind: { name: "Vent arrière", body: "Une ligne droite ajoute deux de vitesse." },
      floor: { name: "Eau basse", body: "À la vitesse 1, une courbe ne descend plus." },
      lowLip: { name: "Crête basse", body: "La vitesse 1 passe une crête." },
      skim: { name: "Rase", body: "Le premier mur rencontré est vide." },
      pocket: { name: "Poche", body: "La première courbe hors piste reste dans la voie." },
      headStart: { name: "Avance", body: "Vous partez à la vitesse 3." },
    },
  },
  es: {
    title: "Surf de un trazo",
    subtitle: "Un trazo es la pista. Una curva gasta velocidad, un corte la vacía y una recta la suma.",
    preparing: "Preparando la ronda.",
    ready: "Un muro para. Una cresta pide velocidad. Perder el pulso te deja caer.",
    play: "Añade el siguiente tramo.",
    start: "Empezar",
    act: { straight: "Recto", left: "Izquierda", right: "Derecha", cut: "Cortar" },
    speed: (n) => `Velocidad ${n}`,
    won: "Quedó velocidad al final del trazo.",
    lost: "Faltó velocidad, o el trazo tocó un muro.",
    enter: "Entrar",
    practice: "Ola de práctica",
    practiceNote: "Una ola nueva, no la del día.",
    pause: "Pausa",
    resume: "Seguir",
    leave: "Salir",
    help: "Ayuda",
    best: (n) => `Mejor final ${n}`,
    record: (wins, losses) => `Logrados ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    left: (n) => `Tiempo ${n}`,
    wall: "muro",
    lip: "cresta",
    open: "libre",
    pick: "Elige un aumento.",
    augment: {
      glide: { name: "Deslizar", body: "Una curva conserva la velocidad." },
      softCut: { name: "Corte suave", body: "Un corte deja velocidad 1." },
      tailwind: { name: "Viento de cola", body: "Una recta suma dos de velocidad." },
      floor: { name: "Agua baja", body: "A velocidad 1, una curva no baja más." },
      lowLip: { name: "Cresta baja", body: "La velocidad 1 pasa una cresta." },
      skim: { name: "Rozar", body: "El primer muro que encuentras queda libre." },
      pocket: { name: "Bolsillo", body: "La primera curva fuera de la pista se queda en el carril." },
      headStart: { name: "Salida", body: "Empiezas a velocidad 3." },
    },
  },
};

const CUE_HZ: Record<SurfCue, number> = {
  straight: 520,
  turn: 390,
  cut: 150,
  lip: 760,
  win: 620,
  lose: 180,
};

function playTone(ctx: AudioContext, frequency: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequency;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

const KEYS: Record<string, Act> = {
  ArrowUp: "straight",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "cut",
};

export default function LineSurf({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [best, setBest] = useState<BestRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const [remain, setRemain] = useState(Math.ceil(FUSE_MS / 1000));
  const [gate, setGate] = useState<"title" | "offer" | "count" | "board">("title");
  const [offer, setOffer] = useState<SurfAugmentId[] | null>(null);
  const [cue, setCue] = useState<SurfCue | null>(null);
  const [spray, setSpray] = useState<{ seq: number; step: number; lane: number } | null>(null);
  const [count, setCount] = useState(3);
  const [practice, setPractice] = useState(false);
  const [paused, setPaused] = useState(false);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const hapticsRef = useRef(createHaptics());
  const noted = useRef(new Set<string>());
  const heard = useRef<Run | null>(null);
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  const practiceRef = useRef(false);
  const pausedRef = useRef(false);
  const fuseLeft = useRef(FUSE_MS);
  runRef.current = run;

  const handleShareCard = useCallback(async () => {
    if (!run) return;
    const canvas = createShareCardCanvas({
      title: "Line Surf",
      subtitle: run.phase === "won" ? "파도 완주 성공" : "라인 서핑 기록",
      score: `${run.speed} SPD`,
      slug: "line-surf",
      customStats: [
        { label: "STEP", value: `${Math.min(run.step + 1, STEPS)} / ${STEPS}` },
        { label: "RECORD", value: `${record?.w ?? 0}W ${record?.l ?? 0}L` },
        { label: "BEST", value: `${best?.value ?? 0}` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `line-surf-${run.speed}spd.png`);
    }
  }, [run, record, best]);

  useEffect(() => {
    const key = kstDateKey();
    const seed = (dateKeyIndex(key) * 0x9e3779b1) >>> 0;
    setDateKey(key);
    setRun(createRun(createPuzzle(seed)));
    try {
      setRecord(getRecord(GAME_ID));
      setBest(getBest(GAME_ID));
    } catch { /* storage can be blocked */ }
  }, []);

  useEffect(() => {
    if (run?.phase !== "play" || paused) return undefined;
    const step = run.step;
    const budget = fuseLeft.current;
    const anchor = performance.now();
    setRemain(Math.max(0, Math.ceil(budget / 1000)));
    const id = window.setInterval(() => {
      const leftMs = budget - (performance.now() - anchor);
      setRemain(Math.max(0, Math.ceil(leftMs / 1000)));
      if (leftMs > 0) return;
      setRun((current) => {
        if (!current || current.phase !== "play" || current.step !== step) return current;
        return expire(current);
      });
    }, 200);
    return () => {
      // Resume must not refill a beat that already ran (2026-10-21).
      fuseLeft.current = pausedRef.current ? Math.max(0, budget - (performance.now() - anchor)) : FUSE_MS;
      window.clearInterval(id);
    };
  }, [run?.phase, run?.step, paused]);

  useEffect(() => {
    if (gate !== "count") return undefined;
    let left = 3;
    setCount(3);
    const id = window.setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCount(left);
        return;
      }
      window.clearInterval(id);
      setRun((current) => (current && current.phase === "ready" ? begin(current) : current));
      setGate("board");
    }, 1000);
    return () => window.clearInterval(id);
  }, [gate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        togglePortal();
        return;
      }
      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setMuted((value) => !value);
        return;
      }
      const act = KEYS[event.key];
      if (!act || event.repeat || runRef.current?.phase !== "play" || pausedRef.current) return;
      event.preventDefault();
      hapticsRef.current.fire("place");
      setRun((current) => (current ? ride(current, act) : current));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (!run || !dateKey) return;
    const heardRun = heard.current;
    heard.current = run;
    const nextCue = heardRun ? surfCue(heardRun, run) : null;
    const nextSpray = heardRun ? sprayCell(heardRun, run) : null;
    if (nextSpray) setSpray((current) => ({ seq: (current?.seq ?? 0) + 1, step: nextSpray.step, lane: nextSpray.lane }));
    else if (nextCue === "lose" || (heardRun && run.puzzle !== heardRun.puzzle)) setSpray(null);
    if (nextCue) setCue(nextCue);
    const previous = phase.current;
    phase.current = run.phase;
    if (previous !== run.phase && (run.phase === "won" || run.phase === "lost")) {
      const key = `${dateKey}:${attempt}`;
      if (!practiceRef.current && !noted.current.has(key)) {
        noted.current.add(key);
        try {
          setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l"));
          setBest(recordBest(GAME_ID, run.speed, "score"));
        } catch { /* best-effort */ }
      }
      if (run.phase === "won") {
        hapticsRef.current.fire("win");
        if (containerRef.current) {
          celebrate(containerRef.current, { preset: "coins" });
        }
      } else {
        hapticsRef.current.fire("fail");
      }
    }
    if (!nextCue || muted || reducedMotion) return;
    const Context = window.AudioContext;
    if (!Context) return;
    if (!audio.current) audio.current = new Context();
    const ctx = audio.current;
    void ctx.resume();
    playTone(ctx, CUE_HZ[nextCue]);
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const dailySeed = () => (dateKey ? (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0 : 0);

  const enter = () => {
    if (!isImmersive) togglePortal();
    fuseLeft.current = FUSE_MS;
    pausedRef.current = false;
    setPaused(false);
    setGate("count");
  };

  const practiceWave = () => {
    if (!dateKey) return;
    const salt = typeof crypto !== "undefined" && crypto.getRandomValues ? (crypto.getRandomValues(new Uint32Array(1))[0] ?? 1) : Date.now();
    practiceRef.current = true;
    setPractice(true);
    setAttempt((value) => value + 1);
    fuseLeft.current = FUSE_MS;
    pausedRef.current = false;
    setPaused(false);
    setRemain(Math.ceil(FUSE_MS / 1000));
    setOffer(surfOffer(salt));
    setRun(createRun(createPuzzle(freshSeed(salt, dailySeed()))));
    setGate("offer");
  };

  const pickAugment = (id: SurfAugmentId) => {
    setRun((current) => (current ? createRun(current.puzzle, id) : current));
    setOffer(null);
    fuseLeft.current = FUSE_MS;
    setGate("count");
  };

  const pause = () => {
    pausedRef.current = true;
    setPaused(true);
  };

  const resume = () => {
    pausedRef.current = false;
    setPaused(false);
  };

  const leave = () => {
    if (isImmersive) togglePortal();
    practiceRef.current = false;
    setPractice(false);
    pausedRef.current = false;
    setPaused(false);
    fuseLeft.current = FUSE_MS;
    setOffer(null);
    setSpray(null);
    if (dateKey) setRun(createRun(createPuzzle(dailySeed())));
    setGate("title");
  };

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={isImmersive ? undefined : (run ? t.subtitle : t.preparing)}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img
            src={LINE_SURF_SPRITES.keyart}
            alt={t.title}
            className="h-32 w-full object-cover sm:h-44"
          />
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
        {!run || !dateKey ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : (
          <div className="space-y-4" data-surf-cue={cue ?? ""} data-augment={run.augment ?? ""}>
            <p className="text-sm text-muted-foreground">{t.date(dateKey)}</p>
            {practice ? <p className="text-sm font-bold text-foreground">{t.practiceNote}</p> : null}
            {gate === "count" ? <p className="text-center text-5xl font-bold tabular-nums text-foreground" aria-live="polite">{count}</p> : null}
            {gate === "board" ? (
              <>
                <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.speed(run.speed)} · {Math.min(run.step + 1, STEPS)} / {STEPS}{run.phase === "play" && !paused ? ` · ${t.left(remain)}` : ""}</p>
                <p className="text-sm text-foreground">{paused ? t.pause : run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
              </>
            ) : null}
            {/* Eight size-8 columns measured 389px on a 375px phone (2026-10-21). */}
            <div className="flex w-full min-w-0 gap-1" aria-hidden="true">
              {run.puzzle.columns.map((column, step) => (
                <div key={step} className={`flex min-w-0 flex-1 flex-col gap-0.5 rounded-md p-0.5 ${step === run.step && run.phase === "play" ? "bg-primary/10" : ""}`}>
                  {Array.from({ length: LANES }, (_, lane) => {
                    const tile = column[lane] ?? "open";
                    const here = step === run.step && lane === run.lane && run.phase === "play";
                    const tone = tile === "wall" ? "bg-foreground/15" : tile === "lip" ? "bg-chart-1" : "bg-muted";
                    const bursting = spray?.step === step && spray.lane === lane;
                    return (
                      <span key={lane} className={`relative flex aspect-square w-full items-center justify-center rounded-sm text-xs ${tone}`}>
                        {here ? "●" : tile === "wall" ? "▮" : tile === "lip" ? "△" : ""}
                        {bursting ? (
                          <span data-spray={`${spray.step}:${spray.lane}`} className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden="true">
                            <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-chart-1 motion-safe:animate-ping" />
                            <span className="absolute bottom-0 left-1/4 size-1.5 rounded-full bg-chart-1 motion-safe:animate-ping" />
                            <span className="absolute bottom-0 right-1/4 size-1.5 rounded-full bg-chart-1 motion-safe:animate-ping" />
                          </span>
                        ) : null}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            {gate === "title" ? <p className="text-sm text-muted-foreground">{t.ready}</p> : (
              <details className="text-sm text-muted-foreground">
                <summary className={`${CONTROL} inline-flex cursor-pointer items-center border-border bg-card text-foreground`}>{`? ${t.help}`}</summary>
                <p className="mt-2">{t.ready}</p>
                <p className="mt-2">▮ {t.wall} · △ {t.lip} {LIP_SPEED}+ · {t.open}</p>
              </details>
            )}
            {gate === "title" ? (
              <button type="button" onClick={enter} className={`${BUTTON} border-primary bg-primary text-primary-foreground`}>{t.enter}</button>
            ) : null}
            {gate === "offer" && offer ? (
              <div className="space-y-2" data-augment-offer={offer.join(" ")}>
                <p className="text-sm font-bold text-foreground">{t.pick}</p>
                {offer.map((id) => (
                  <button key={id} type="button" onClick={() => pickAugment(id)} className={`${BUTTON} block w-full text-left`}>
                    <span className="block">{t.augment[id].name}</span>
                    <span className="mt-1 block text-sm font-normal text-muted-foreground">{t.augment[id].body}</span>
                  </button>
                ))}
                <button type="button" onClick={leave} className={`${CONTROL} border-border bg-card text-foreground`}>{t.leave}</button>
              </div>
            ) : null}
            {gate === "board" && paused ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={resume} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.resume}</button>
                <button type="button" onClick={practiceWave} className={`${CONTROL} border-border bg-card text-foreground`}>{t.practice}</button>
                <button type="button" onClick={leave} className={`${CONTROL} border-border bg-card text-foreground`}>{t.leave}</button>
                <button type="button" onClick={() => setMuted((value) => !value)} className={`${CONTROL} border-border bg-card text-foreground`}>{muted ? portalLabels.unmute : portalLabels.mute}</button>
              </div>
            ) : null}
            {gate === "board" && !paused && run.phase === "play" ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {ACTS.map((act) => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => {
                        hapticsRef.current.fire("place");
                        setRun((current) => (current ? ride(current, act) : current));
                      }}
                      className={BUTTON}
                    >
                      {t.act[act]}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={pause} className={`${CONTROL} border-border bg-card text-foreground`}>{t.pause}</button>
              </>
            ) : null}
            {gate === "board" && !paused && run.phase === "ready" ? (
              <button type="button" onClick={() => setRun((current) => (current ? begin(current) : current))} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
            ) : null}
            {gate === "board" && !paused && (run.phase === "won" || run.phase === "lost") ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleShareCard}
                  className={`${BUTTON} flex-1 flex items-center justify-center gap-1.5`}
                >
                  {shareCardCopied ? <Check className="size-4 text-primary" /> : <Share2 className="size-4" />}
                  {shareCardCopied ? "복사됨!" : "결과 카드 공유"}
                </button>
                <button
                  type="button"
                  onClick={practiceWave}
                  className={`${BUTTON} flex-1 border-primary bg-primary text-primary-foreground`}
                >
                  {t.practice}
                </button>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}{best?.unit === "score" ? ` · ${t.best(best.value)}` : ""}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
