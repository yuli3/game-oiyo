// Hanyang Timeslip — an original pixel-art adventure set in Oiyo's 1426 Hanyang
// (2026-11-16). React owns the flow (title → town/field/gate → ending), the
// dialogue box and the touch controls; HanyangTimeslipCanvas draws the world
// and runs the fixed-step simulation; the rules live in src/lib/games.

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Copy,
  Home,
  Maximize2,
  Minimize2,
  Package,
  Vibrate,
  VibrateOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Locale } from "../../lib/i18n";
import { COPY, fmt, type TimeslipCopy } from "../../lib/games/hanyang-timeslip-copy";
import { DAILY_KEY, INN_COST, RIVER_CHARM_HP, RIVER_REPEAT_COINS, SAVE_KEY, MUTE_KEY, SLUG, TOWN_RETURN, TRAVELER_NAMES, type FieldId, type NpcId } from "../../lib/games/hanyang-timeslip-config";
import {
  createField,
  createGame,
  createTown,
  faint,
  fromSave,
  generateDailyShift,
  generateShift,
  heroAttack,
  interact,
  isCorrectCall,
  nextRandom,
  restAtInn,
  riftOpen,
  settleShift,
  shardCount,
  swordPrice,
  toSave,
  upgradeSword,
  violationOf,
  type Dir,
  type FieldEvent,
  type Shift,
  type TownEvent,
} from "../../lib/games/hanyang-timeslip";
import type { TimeslipInput, TimeslipView } from "./HanyangTimeslipCanvas";
import { createCuePlayer, RETRO_8BIT_CUES, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, writeHapticsEnabled, type HapticKind, type Haptics } from "../../lib/games/haptics";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { recordAchievementEvent, recordBest, recordResult } from "../../lib/games/records";
import { createMusicPlayer, type MusicPlayer, type MusicTheme } from "../../lib/games/hanyang-timeslip-music";

const Canvas = lazy(() => import("./HanyangTimeslipCanvas"));

type Phase = "title" | "play" | "ending" | "daily";

interface Choice {
  label: string;
  run: () => void;
}

interface Dialog {
  lines: string[];
  i: number;
  choices?: Choice[];
  onClose?: () => void;
}

interface GateRun {
  shift: Shift;
  idx: number;
  correct: number;
  marks: boolean[];
  feedback: { ok: boolean; reason: string } | null;
  daily: string | null;
}

interface DailyResult {
  day: string;
  correct: number;
  total: number;
  best: number;
  marks: boolean[];
}

/** Today's date in Seoul, so the daily line turns over at Korean midnight for everyone. */
function seoulDay(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function readDailyBest(day: string): number | null {
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { day?: unknown; best?: unknown };
    return data.day === day && typeof data.best === "number" ? data.best : null;
  } catch {
    return null;
  }
}

function writeDailyBest(day: string, best: number): void {
  try {
    window.localStorage.setItem(DAILY_KEY, JSON.stringify({ day, best }));
  } catch {
    /* private mode */
  }
}

function readSave(): string | null {
  try {
    return window.localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

const padButton =
  "flex size-14 touch-none select-none items-center justify-center rounded-xl border border-border bg-muted text-foreground shadow-sm active:scale-95 active:bg-accent motion-reduce:transition-none";
const actionButton =
  "flex size-16 touch-none select-none flex-col items-center justify-center rounded-full border-2 font-black shadow-md active:scale-95 motion-reduce:transition-none";
const iconButton =
  "flex size-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function HanyangTimeslip({ locale = "ko" }: { locale?: Locale }) {
  const t: TimeslipCopy = COPY[locale] ?? COPY.en;
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("title");
  const [scene, setScene] = useState<TimeslipView["scene"]>("title");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [gateRun, setGateRun] = useState<GateRun | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [muted, setMuted] = useState(false);
  const [haptic, setHaptic] = useState(true);
  const [fieldId, setFieldId] = useState<FieldId | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [ending, setEnding] = useState<{ level: number; kills: number; gate: number; seconds: number; faints: number } | null>(null);

  const viewRef = useRef<TimeslipView>({
    scene: "title",
    game: createGame(1),
    town: createTown(),
    field: null,
    gate: { traveler: null, bagOpen: false, enterT: 0, stamp: null },
  });
  const inputRef = useRef<TimeslipInput>({ dirs: [], a: false, aPressed: false, bPressed: false });
  const pausedRef = useRef(false);
  const dialogRef = useRef<Dialog | null>(null);
  dialogRef.current = dialog;
  pausedRef.current = dialog !== null || showHelp;

  const { isImmersive, containerRef, togglePortal, enterPortal } = useArcadePortal({ locale });

  // ─── Sound & haptics ───
  // Created after mount so the server HTML and the first client render match.
  const audioRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef<Haptics | null>(null);
  const musicRef = useRef<MusicPlayer | null>(null);
  const [hapticSupported, setHapticSupported] = useState(false);
  useEffect(() => {
    const m = readMutedPref(MUTE_KEY);
    const audio = createCuePlayer<CoreCue>({ cues: RETRO_8BIT_CUES, muted: m });
    const haptics = createHaptics({ enabled: readHapticsEnabled() });
    const music = createMusicPlayer({ muted: m });
    audioRef.current = audio;
    hapticsRef.current = haptics;
    musicRef.current = music;
    setMuted(m);
    setHaptic(haptics.enabled);
    setHapticSupported(haptics.supported);
    setHasSave(fromSave(readSave()) !== null);
    recordAchievementEvent(SLUG, "opened");
    return () => {
      audio.close();
      music.close();
    };
  }, []);

  // One loop per place; silence on the title screen.
  useEffect(() => {
    let theme: MusicTheme | null = null;
    if (phase === "ending") theme = "town";
    else if (phase === "play" || phase === "daily") {
      if (scene === "gate" || phase === "daily") theme = "gate";
      else if (scene === "field") theme = fieldId === "rift" ? "boss" : "field";
      else theme = "town";
    }
    musicRef.current?.play(theme);
  }, [fieldId, phase, scene]);
  const cue = useCallback((name: CoreCue, step = 1) => audioRef.current?.play(name, { step }), []);
  const buzz = useCallback((kind: HapticKind) => hapticsRef.current?.fire(kind), []);

  const save = useCallback(() => {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(toSave(viewRef.current.game)));
      setHasSave(true);
    } catch {
      /* private mode: play on without saving */
    }
  }, []);

  const say = useCallback((lines: string[], choices?: Choice[], onClose?: () => void) => {
    inputRef.current.dirs = [];
    setDialog({ lines, i: 0, choices, onClose });
  }, []);

  const closeDialog = useCallback(() => {
    const d = dialogRef.current;
    setDialog(null);
    d?.onClose?.();
  }, []);

  const setSceneBoth = useCallback((next: TimeslipView["scene"]) => {
    viewRef.current.scene = next;
    setScene(next);
  }, []);

  const backToTown = useCallback((at: { tx: number; ty: number }, dir: Dir = "down") => {
    viewRef.current.town = createTown(at, dir);
    viewRef.current.field = null;
    setFieldId(null);
    setSceneBoth("town");
    save();
  }, [save, setSceneBoth]);

  // ─── Flow: title → play ───
  const begin = useCallback((fresh: boolean) => {
    const loaded = fresh ? null : fromSave(readSave());
    const game = loaded ?? createGame((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    viewRef.current.game = game;
    viewRef.current.town = createTown(loaded ? TOWN_RETURN.inn : undefined, "up");
    viewRef.current.field = null;
    setPhase("play");
    setSceneBoth("town");
    setConfirmNew(false);
    setEnding(null);
    setDailyResult(null);
    recordAchievementEvent(SLUG, "played");
    void enterPortal();
    cue("tap");
    if (!loaded) {
      save();
      say(t.story);
    }
  }, [cue, enterPortal, save, say, setSceneBoth, t.story]);

  // ─── Gate ───
  const showTraveler = useCallback((run: GateRun) => {
    const g = viewRef.current.gate;
    g.traveler = run.shift.travelers[run.idx] ?? null;
    g.bagOpen = false;
    g.enterT = 0;
    g.stamp = null;
    setBagOpen(false);
    setGateRun(run);
  }, []);

  const startShift = useCallback(() => {
    const game = viewRef.current.game;
    const seed = Math.floor(nextRandom(game) * 0xffffffff);
    const shift = generateShift(seed, game.progress.shifts);
    setSceneBoth("gate");
    showTraveler({ shift, idx: 0, correct: 0, marks: [], feedback: null, daily: null });
  }, [setSceneBoth, showTraveler]);

  const startDaily = useCallback(() => {
    const day = seoulDay();
    viewRef.current.field = null;
    setDailyResult(null);
    setCopied(false);
    setPhase("play");
    setSceneBoth("gate");
    recordAchievementEvent(SLUG, "played");
    void enterPortal();
    cue("tap");
    showTraveler({ shift: generateDailyShift(day), idx: 0, correct: 0, marks: [], feedback: null, daily: day });
    say([t.dailyIntro]);
  }, [cue, enterPortal, say, setSceneBoth, showTraveler, t.dailyIntro]);

  // ─── Town talk ───
  const talk = useCallback((id: NpcId) => {
    const game = viewRef.current.game;
    const hero = game.hero;
    cue("tap");
    if (id === "innkeeper") {
      say([t.innGreet], [
        { label: fmt(t.innRest, { cost: INN_COST }), run: () => {
          const r = restAtInn(hero);
          if (r === "full") say([t.innFull]);
          else {
            save();
            cue("success");
            buzz("success");
            say([t.innDone]);
          }
        } },
        { label: t.leave, run: () => undefined },
      ]);
    } else if (id === "smith") {
      const price = swordPrice(hero);
      if (price === null) {
        say([t.smithMaxed]);
        return;
      }
      say([fmt(t.smithGreet, { price })], [
        { label: fmt(t.smithUpgrade, { price }), run: () => {
          const r = upgradeSword(hero);
          if (r === "ok") {
            save();
            cue("combo", 3);
            buzz("combo");
            say([fmt(t.smithDone, { atk: heroAttack(hero) })]);
          } else {
            cue("fail");
            say([t.smithPoor]);
          }
        } },
        { label: t.leave, run: () => undefined },
      ]);
    } else if (id === "sage") {
      const p = game.progress;
      const lines = [t.sageIntro];
      if (riftOpen(p)) lines.push(t.sageRift);
      else {
        if (!p.forest) lines.push(t.sageForest);
        if (!p.gate) lines.push(t.sageGate);
      }
      if (p.forest && !p.river) lines.push(t.sageRiver);
      say(lines);
    } else if (id === "guard") {
      say([game.progress.gate ? t.guardDone : t.guardGreet], [
        { label: t.guardWork, run: () => startShift() },
        { label: t.later, run: () => undefined },
      ]);
    }
  }, [buzz, cue, save, say, startShift, t]);

  // ─── Fields ───
  const startField = useCallback((id: FieldId) => {
    viewRef.current.field = createField(id);
    inputRef.current.aPressed = false;
    inputRef.current.bPressed = false;
    setFieldId(id);
    setSceneBoth("field");
    cue("place");
    if (id === "rift") say([t.bossIntro]);
    if (id === "river" && !viewRef.current.game.progress.river) say([t.riverIntro]);
  }, [cue, say, setSceneBoth, t.bossIntro, t.riverIntro]);

  const onTownEvents = useCallback((events: TownEvent[]) => {
    for (const e of events) {
      if (e.type === "enter") startField(e.field);
    }
  }, [startField]);

  const finishGame = useCallback(() => {
    const game = viewRef.current.game;
    const seconds = Math.round(game.playMs / 1000);
    recordResult(SLUG, "w");
    recordAchievementEvent(SLUG, "cleared");
    recordBest(SLUG, seconds, "seconds", `Lv${game.hero.level}`);
    setEnding({
      level: game.hero.level,
      kills: game.hero.kills,
      gate: game.progress.gateTotal ? Math.round((game.progress.gateCorrect / game.progress.gateTotal) * 100) : 0,
      seconds,
      faints: game.hero.faints,
    });
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    setHasSave(false);
    viewRef.current.town = createTown(TOWN_RETURN.rift, "down");
    setSceneBoth("ending");
    setPhase("ending");
  }, [setSceneBoth]);

  const onFieldEvents = useCallback((events: FieldEvent[]) => {
    const game = viewRef.current.game;
    for (const e of events) {
      if (e.type === "swing") cue("place");
      else if (e.type === "hit") cue(e.crit ? "combo" : "tap", e.crit ? 4 : 2);
      else if (e.type === "kill") {
        cue("success");
        buzz("tap");
      } else if (e.type === "levelup") {
        cue("combo", 5);
        buzz("combo");
      } else if (e.type === "hurt") {
        cue("fail");
        buzz("fail");
      } else if (e.type === "pickup") cue("success", 3);
      else if (e.type === "goal") {
        cue("win");
        buzz("win");
        save();
        if (e.field === "river") {
          const line = e.first ? fmt(t.riverCharm, { hp: RIVER_CHARM_HP }) : fmt(t.riverRepeat, { coins: RIVER_REPEAT_COINS });
          say([line], undefined, () => backToTown(TOWN_RETURN.river, "down"));
        } else if (e.first) {
          say([fmt(t.shardGot, { n: shardCount(game.progress) })], undefined, () => backToTown(TOWN_RETURN.south, "up"));
        } else backToTown(TOWN_RETURN.south, "up");
      } else if (e.type === "boss-dead") {
        cue("win");
        buzz("win");
        say([fmt(t.shardGot, { n: 3 }), ...t.ending], undefined, finishGame);
      } else if (e.type === "defeat") {
        cue("lose");
        buzz("fail");
        const lost = faint(game.hero);
        say([fmt(t.defeat, { lost })], undefined, () => backToTown(TOWN_RETURN.inn, "up"));
      }
    }
  }, [backToTown, buzz, cue, finishGame, save, say, t]);

  const decide = useCallback((approve: boolean) => {
    const run = gateRun;
    if (!run || run.feedback) return;
    const traveler = run.shift.travelers[run.idx];
    const ok = isCorrectCall(traveler, run.shift, approve);
    const violation = violationOf(traveler, run.shift);
    viewRef.current.gate.stamp = { approve, t: 0 };
    cue(ok ? "success" : "fail");
    buzz(ok ? "success" : "fail");
    const next: GateRun = { ...run, correct: run.correct + (ok ? 1 : 0), marks: [...run.marks, ok], feedback: { ok, reason: t.reasons[violation ?? "none"] } };
    setGateRun(next);
    window.setTimeout(() => {
      const total = next.shift.travelers.length;
      if (next.idx + 1 < total) {
        showTraveler({ ...next, idx: next.idx + 1, feedback: null });
        return;
      }
      if (next.daily) {
        const prev = readDailyBest(next.daily);
        const best = Math.max(prev ?? 0, next.correct);
        writeDailyBest(next.daily, best);
        if (prev === null || next.correct > prev) recordAchievementEvent(SLUG, "personal-best");
        setGateRun(null);
        viewRef.current.gate.traveler = null;
        setDailyResult({ day: next.daily, correct: next.correct, total, best, marks: next.marks });
        setSceneBoth("title");
        setPhase("daily");
        cue(next.correct === total ? "win" : "success");
        return;
      }
      const result = settleShift(viewRef.current.game, next.correct);
      setGateRun(null);
      viewRef.current.gate.traveler = null;
      const lines = [fmt(t.shiftDone, { correct: result.correct, coins: result.coins })];
      if (result.earnedShard) {
        lines.push(t.shardGate, fmt(t.shardGot, { n: shardCount(viewRef.current.game.progress) }));
        cue("win");
        buzz("win");
      }
      backToTown(TOWN_RETURN.gate, "down");
      say(lines);
    }, 1300);
  }, [backToTown, buzz, cue, gateRun, say, setSceneBoth, showTraveler, t]);

  // ─── Buttons ───
  const pressA = useCallback(() => {
    const d = dialogRef.current;
    if (d) {
      if (d.i < d.lines.length - 1) {
        setDialog({ ...d, i: d.i + 1 });
        cue("tap");
      } else if (!d.choices) closeDialog();
      return;
    }
    const view = viewRef.current;
    if (view.scene === "town") {
      const it = interact(view.town);
      if (!it) return;
      if (it.kind === "npc") talk(it.id);
      else if (it.kind === "dock-closed") say([t.dockClosed]);
      else if (it.kind === "rift-closed") say([fmt(t.riftClosed, { n: Number(view.game.progress.forest) + Number(view.game.progress.gate) })]);
      else if (it.kind === "jangseung") say([t.jangseung]);
      else if (it.kind === "water") say([t.water]);
      else if (it.kind === "gate") say([t.gateTile]);
    } else if (view.scene === "field") {
      inputRef.current.aPressed = true;
      inputRef.current.a = true;
    }
  }, [closeDialog, cue, say, t, talk]);

  const releaseA = useCallback(() => {
    inputRef.current.a = false;
  }, []);

  const pressB = useCallback(() => {
    const d = dialogRef.current;
    if (d) {
      if (d.i < d.lines.length - 1) setDialog({ ...d, i: d.i + 1 });
      else if (!d.choices) closeDialog();
      return;
    }
    if (viewRef.current.scene === "field") inputRef.current.bPressed = true;
  }, [closeDialog]);

  const pressDir = useCallback((dir: Dir) => {
    const dirs = inputRef.current.dirs;
    if (!dirs.includes(dir)) dirs.push(dir);
    if (dir === "up" && viewRef.current.scene === "field" && !dialogRef.current) inputRef.current.aPressed = true;
  }, []);
  const releaseDir = useCallback((dir: Dir) => {
    inputRef.current.dirs = inputRef.current.dirs.filter((d) => d !== dir);
  }, []);

  // Keyboard.
  useEffect(() => {
    if (phase !== "play") return;
    const keyDir: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const dir = keyDir[e.key] ?? keyDir[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        if (!e.repeat) pressDir(dir);
      } else if (["z", "Z", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) pressA();
      } else if (["x", "X", "Escape"].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) pressB();
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = keyDir[e.key] ?? keyDir[e.key.toLowerCase()];
      if (dir) releaseDir(dir);
      if (["z", "Z", " ", "Enter"].includes(e.key)) releaseA();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, pressA, pressB, pressDir, releaseA, releaseDir]);

  // Leaving the tab mid-field drops held keys so the hero does not run off on return.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) inputRef.current = { dirs: [], a: false, aPressed: false, bPressed: false };
      musicRef.current?.setHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const hold = (onDown: () => void, onUp: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      onDown();
    },
    onPointerUp: onUp,
    onPointerCancel: onUp,
    onLostPointerCapture: onUp,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioRef.current?.setMuted(next);
    musicRef.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };
  const toggleHaptic = () => {
    const next = !haptic;
    setHaptic(next);
    hapticsRef.current?.setEnabled(next);
    writeHapticsEnabled(next);
  };

  const traveler = gateRun ? gateRun.shift.travelers[gateRun.idx] : null;
  const travelerName = traveler ? (locale === "ko" ? TRAVELER_NAMES[traveler.name].ko : TRAVELER_NAMES[traveler.name].roman) : "";
  const shareDaily = async () => {
    if (!dailyResult) return;
    const line = dailyResult.marks.map((m) => (m ? "🟩" : "🟥")).join("");
    const text = `${t.dailyStreakLine} ${dailyResult.day}\n${line} ${dailyResult.correct}/${dailyResult.total}\n${window.location.origin}${window.location.pathname}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      cue("success");
    } catch {
      setCopied(false);
    }
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      ref={containerRef}
      data-game={SLUG}
      className={`mx-auto flex w-full max-w-3xl select-none flex-col items-center gap-2 rounded-2xl bg-card p-2 text-card-foreground sm:p-4 ${
        isImmersive ? "fixed inset-0 z-50 m-0 h-dvh max-w-none justify-center overflow-y-auto rounded-none bg-background" : "relative"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <h2 className="truncate text-base font-black text-foreground sm:text-lg">{t.title}</h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" className={iconButton} onClick={() => setShowHelp((v) => !v)} aria-label={t.helpLabel}>
            <CircleHelp className="size-5" />
          </button>
          <button type="button" className={iconButton} onClick={toggleMute} aria-label={t.sound}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5 text-primary" />}
          </button>
          {hapticSupported && (
            <button type="button" className={iconButton} onClick={toggleHaptic} aria-label={t.vibration}>
              {haptic ? <Vibrate className="size-5 text-primary" /> : <VibrateOff className="size-5" />}
            </button>
          )}
          <button type="button" className={iconButton} onClick={togglePortal} aria-label={t.fullscreen}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <Suspense fallback={<div className="mx-auto aspect-square w-full max-w-sm animate-pulse rounded-lg bg-muted" />}>
          <Canvas
            viewRef={viewRef}
            inputRef={inputRef}
            pausedRef={pausedRef}
            reducedMotion={reducedMotion}
            reserveHeight={260}
            onTownEvents={onTownEvents}
            onFieldEvents={onFieldEvents}
          />
        </Suspense>

        {phase === "title" && (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-xl border-2 border-border bg-card/95 p-4 text-center shadow-xl">
              <p className="text-xl font-black text-foreground">{t.title}</p>
              <p className="text-sm text-muted-foreground">{t.tagline}</p>
              {confirmNew ? (
                <>
                  <p className="text-sm font-bold text-foreground">{t.newGameConfirm}</p>
                  <div className="flex w-full gap-2">
                    <button type="button" className="min-h-11 flex-1 rounded-lg bg-primary px-3 font-bold text-primary-foreground" onClick={() => begin(true)}>
                      {t.newGame}
                    </button>
                    <button type="button" className="min-h-11 flex-1 rounded-lg border border-border bg-muted px-3 font-bold text-foreground" onClick={() => setConfirmNew(false)}>
                      {t.close}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex w-full flex-col gap-2">
                  {hasSave && (
                    <button type="button" className="min-h-12 rounded-lg bg-primary px-4 text-base font-black text-primary-foreground" onClick={() => begin(false)}>
                      {t.continue}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`min-h-12 rounded-lg px-4 text-base font-black ${hasSave ? "border border-border bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}
                    onClick={() => (hasSave ? setConfirmNew(true) : begin(true))}
                  >
                    {t.newGame}
                  </button>
                  <button
                    type="button"
                    className="flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-primary bg-card px-4 text-base font-black text-primary"
                    onClick={startDaily}
                  >
                    <CalendarDays className="size-5" aria-hidden="true" />
                    {t.dailyButton}
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t.controlsHint}</p>
            </div>
          </div>
        )}

        {phase === "ending" && ending && (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border-2 border-border bg-card/95 p-4 shadow-xl">
              <p className="text-center text-xl font-black text-foreground">{t.endTitle}</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{t.endLevel}</dt>
                <dd className="text-right font-bold">Lv {ending.level}</dd>
                <dt className="text-muted-foreground">{t.endKills}</dt>
                <dd className="text-right font-bold">{ending.kills}</dd>
                <dt className="text-muted-foreground">{t.endGate}</dt>
                <dd className="text-right font-bold">{ending.gate}%</dd>
                <dt className="text-muted-foreground">{t.endTime}</dt>
                <dd className="text-right font-bold">{formatTime(ending.seconds)}</dd>
                <dt className="text-muted-foreground">{t.endFaints}</dt>
                <dd className="text-right font-bold">{ending.faints}</dd>
              </dl>
              <button type="button" className="mt-1 min-h-12 rounded-lg bg-primary px-4 font-black text-primary-foreground" onClick={() => begin(true)}>
                {t.playAgain}
              </button>
            </div>
          </div>
        )}

        {phase === "daily" && dailyResult && (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="flex w-full max-w-xs flex-col items-center gap-2 rounded-xl border-2 border-border bg-card/95 p-4 text-center shadow-xl" role="status">
              <p className="text-lg font-black text-foreground">{fmt(t.dailyResult, { correct: dailyResult.correct, total: dailyResult.total })}</p>
              <p className="text-2xl tracking-tight" aria-hidden="true">{dailyResult.marks.map((m) => (m ? "🟩" : "🟥")).join("")}</p>
              <p className="text-sm text-muted-foreground">{dailyResult.day} · {fmt(t.dailyBest, { best: dailyResult.best, total: dailyResult.total })}</p>
              <div className="flex w-full gap-2">
                <button type="button" className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 font-bold text-primary-foreground" onClick={() => void shareDaily()}>
                  <Copy className="size-4" aria-hidden="true" />
                  {copied ? t.dailyCopied : t.dailyShare}
                </button>
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-lg border border-border bg-muted px-3 font-bold text-foreground"
                  onClick={() => {
                    setDailyResult(null);
                    setPhase("title");
                  }}
                >
                  {t.dailyBack}
                </button>
              </div>
            </div>
          </div>
        )}

        {dialog && (
          <div className="absolute inset-x-2 bottom-2 mx-auto max-w-md" role="dialog" aria-live="polite">
            <button
              type="button"
              className="w-full rounded-lg border-2 border-foreground bg-card/95 p-3 text-left text-sm leading-relaxed text-foreground shadow-lg sm:text-base"
              onClick={pressA}
            >
              {dialog.lines[dialog.i]}
              {(dialog.i < dialog.lines.length - 1 || !dialog.choices) && <span className="ml-1 animate-pulse text-primary motion-reduce:animate-none">▼</span>}
            </button>
            {dialog.choices && dialog.i === dialog.lines.length - 1 && (
              <div className="mt-1.5 flex gap-1.5">
                {dialog.choices.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className="min-h-11 flex-1 rounded-lg border-2 border-foreground bg-primary px-2 text-sm font-bold text-primary-foreground"
                    onClick={() => {
                      setDialog(null);
                      c.run();
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showHelp && (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="max-h-full w-full max-w-sm overflow-y-auto rounded-xl border-2 border-border bg-card/95 p-4 shadow-xl">
              <ul className="list-disc space-y-1.5 pl-4 text-sm text-foreground">
                {[...t.help, t.helpRiver].map((line) => <li key={line}>{line}</li>)}
              </ul>
              <button type="button" className="mt-3 min-h-11 w-full rounded-lg bg-primary font-bold text-primary-foreground" onClick={() => setShowHelp(false)}>
                {t.close}
              </button>
            </div>
          </div>
        )}
      </div>

      {phase === "play" && scene === "gate" && gateRun && traveler && (
        <div className="flex w-full max-w-md flex-col gap-2">
          <div className="rounded-lg border border-border bg-muted p-2 text-xs">
            <p className="font-bold text-foreground">{t.rulesTitle}</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {gateRun.shift.rules.map((r) => (
                <li key={r}>• {fmt(t.rules[r], { prov: gateRun.shift.banned ? t.provinces[gateRun.shift.banned] : "" })}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border-2 border-foreground bg-card p-2 text-sm">
            <p className="text-xs font-bold text-muted-foreground">{fmt(t.traveler, { i: gateRun.idx + 1 })}</p>
            <dl className="grid grid-cols-2 gap-x-3">
              <dt className="text-muted-foreground">{t.name}</dt>
              <dd className="font-bold">{travelerName}</dd>
              <dt className="text-muted-foreground">{t.origin}</dt>
              <dd className="font-bold">{t.provinces[traveler.origin]}</dd>
              <dt className="text-muted-foreground">{t.seal}</dt>
              <dd className="font-bold">{t.seals[traveler.seal]}</dd>
              {bagOpen && (
                <>
                  <dt className="text-muted-foreground">{t.bag}</dt>
                  <dd className="font-bold">{traveler.items.map((i) => t.items[i]).join(", ")}</dd>
                </>
              )}
            </dl>
            {gateRun.feedback && (
              <p className={`mt-1 font-bold ${gateRun.feedback.ok ? "text-success" : "text-destructive"}`} role="status">
                {gateRun.feedback.ok ? t.correct : t.wrong} {gateRun.feedback.reason}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={bagOpen || Boolean(gateRun.feedback)}
              className="flex min-h-12 items-center justify-center gap-1 rounded-lg border border-border bg-muted px-2 text-sm font-bold text-foreground disabled:opacity-50"
              onClick={() => {
                viewRef.current.gate.bagOpen = true;
                setBagOpen(true);
                cue("tap");
              }}
            >
              <Package className="size-4" aria-hidden="true" />
              {t.openBag}
            </button>
            <button
              type="button"
              disabled={Boolean(gateRun.feedback)}
              className="flex min-h-12 items-center justify-center gap-1 rounded-lg bg-success px-2 text-sm font-black text-success-foreground disabled:opacity-50"
              onClick={() => decide(true)}
            >
              <Check className="size-5" aria-hidden="true" />
              {t.approve}
            </button>
            <button
              type="button"
              disabled={Boolean(gateRun.feedback)}
              className="flex min-h-12 items-center justify-center gap-1 rounded-lg bg-destructive px-2 text-sm font-black text-primary-foreground disabled:opacity-50"
              onClick={() => decide(false)}
            >
              <X className="size-5" aria-hidden="true" />
              {t.deny}
            </button>
          </div>
        </div>
      )}

      {phase === "play" && scene !== "gate" && (
        <div className="flex w-full max-w-md items-center justify-between gap-3 px-1 pb-2">
          <div className="grid grid-cols-3 grid-rows-3 gap-1">
            <span />
            <button type="button" className={padButton} aria-label={t.up} {...hold(() => pressDir("up"), () => releaseDir("up"))}>
              <ChevronUp className="size-7" />
            </button>
            <span />
            <button type="button" className={padButton} aria-label={t.left} {...hold(() => pressDir("left"), () => releaseDir("left"))}>
              <ChevronLeft className="size-7" />
            </button>
            <span className="flex items-center justify-center">
              {scene === "field" && (
                <button type="button" className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground" aria-label={t.retreat} onClick={() => (fieldId === "river" ? backToTown(TOWN_RETURN.river, "down") : backToTown(TOWN_RETURN.south, "up"))}>
                  <Home className="size-4" />
                </button>
              )}
            </span>
            <button type="button" className={padButton} aria-label={t.right} {...hold(() => pressDir("right"), () => releaseDir("right"))}>
              <ChevronRight className="size-7" />
            </button>
            <span />
            <button type="button" className={padButton} aria-label={t.down} {...hold(() => pressDir("down"), () => releaseDir("down"))}>
              <ChevronDown className="size-7" />
            </button>
            <span />
          </div>
          <div className="flex items-end gap-3">
            <button type="button" className={`${actionButton} mb-0 border-foreground bg-secondary text-secondary-foreground`} aria-label={t.bButton} {...hold(pressB, () => undefined)}>
              B
            </button>
            <button type="button" className={`${actionButton} mb-6 border-foreground bg-primary text-primary-foreground`} aria-label={t.aButton} {...hold(pressA, releaseA)}>
              A
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
