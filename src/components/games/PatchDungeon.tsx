// The shell stays scrollable. data-game-surface would block the guide on a
// phone (2026-10-21). Button words stay on the first room's verbs: after a
// swap, that printed word is the old control, and pressing it loses the room.
// The fuse is play time, so reduced motion does not skip it.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import {
  GAME_ID,
  ROOMS,
  VERBS,
  begin,
  createPuzzle,
  createRun,
  expire,
  press,
  type Run,
  type Verb,
} from "../../lib/games/patch-dungeon";

const FUSE_MS = 3600;
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const GLYPH: Record<Verb, string> = { step: "▢", brace: "▼", look: "◆" };

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  verb: Record<Verb, string>;
  scene: Record<Verb, string>;
  same: string;
  swap: (a: string, b: string) => string;
  score: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  left: (n: number) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "패치노트 던전",
    subtitle: "방마다 동사 하나가 바뀝니다. 버튼의 글자는 첫 방 그대로입니다. 옛 조작을 그대로 누르면 그 방에서 집니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "한 줄만 읽고, 글자가 가리키던 자리를 그대로 믿지 마세요.",
    play: "필요한 동사가 지금 있는 버튼을 누르세요.",
    start: "시작",
    verb: { step: "이동", brace: "버티기", look: "살피기" },
    scene: { step: "발밑이 비었습니다.", brace: "위가 내려옵니다.", look: "앞이 어둡습니다." },
    same: "이번 방은 버튼에 적힌 그대로입니다.",
    swap: (a, b) => `바뀜: ${a} · ${b}`,
    score: (n) => `지난 방 ${n} / ${ROOMS}`,
    won: "다섯 방을 옛 조작 없이 지났습니다.",
    lost: "옛 조작이거나, 방이 닫혔습니다.",
    again: "같은 던전 다시",
    best: (n) => `가장 멀리 ${n}`,
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    left: (n) => `남은 시간 ${n}`,
  },
  en: {
    title: "Patch Dungeon",
    subtitle: "One verb changes each room. The words on the buttons stay as they were in the first room. Pressing that old control loses the room.",
    preparing: "Preparing the round.",
    ready: "Read the one line. Do not trust the seat the word used to point at.",
    play: "Press the button that holds the verb this room needs now.",
    start: "Start",
    verb: { step: "Step", brace: "Brace", look: "Look" },
    scene: { step: "The floor is open.", brace: "Something drops from above.", look: "The way ahead is dark." },
    same: "This room matches the words on the buttons.",
    swap: (a, b) => `Swap: ${a} · ${b}`,
    score: (n) => `Rooms ${n} / ${ROOMS}`,
    won: "Five rooms, without the old control.",
    lost: "That was the old control, or the room closed.",
    again: "Same dungeon again",
    best: (n) => `Best rooms ${n}`,
    record: (wins, losses) => `Cleared ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    left: (n) => `Time left ${n}`,
  },
  ja: {
    title: "パッチの迷宮",
    subtitle: "部屋ごとに動詞が一つ変わります。ボタンの文字は最初の部屋のままです。古い操作のまま押すとその部屋で負けます。",
    preparing: "盤面を準備しています。",
    ready: "一行だけ読んで、文字が指していた場所をそのまま信じないでください。",
    play: "今必要な動詞があるボタンを押してください。",
    start: "開始",
    verb: { step: "移動", brace: "踏ん張り", look: "見回り" },
    scene: { step: "足元が空いています。", brace: "上が落ちてきます。", look: "前が暗いです。" },
    same: "この部屋はボタンに書いてあるとおりです。",
    swap: (a, b) => `変更: ${a} · ${b}`,
    score: (n) => `通過 ${n} / ${ROOMS}`,
    won: "古い操作なしで五部屋を抜けました。",
    lost: "古い操作か、部屋が閉まりました。",
    again: "同じ迷宮でもう一度",
    best: (n) => `いちばん遠く ${n}`,
    record: (wins, losses) => `抜けた ${wins} · 落ちた ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    left: (n) => `残り ${n}`,
  },
  zh: {
    title: "补丁地牢",
    subtitle: "每个房间改一个动词。按钮上的字一直是第一间的。还按旧操作，就在这间输掉。",
    preparing: "正在准备这一局。",
    ready: "只读这一行。不要相信那个字原来所在的位置。",
    play: "按现在放着所需动词的那个按钮。",
    start: "开始",
    verb: { step: "移动", brace: "稳住", look: "查看" },
    scene: { step: "脚下是空的。", brace: "上面掉下来了。", look: "前面是黑的。" },
    same: "这一间和按钮上写的一样。",
    swap: (a, b) => `对调: ${a} · ${b}`,
    score: (n) => `通过 ${n} / ${ROOMS}`,
    won: "没有用旧操作，过了五间。",
    lost: "那是旧操作，或者房间已经关上。",
    again: "同一座地牢再来",
    best: (n) => `最远 ${n}`,
    record: (wins, losses) => `通过 ${wins} · 失败 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    left: (n) => `剩余 ${n}`,
  },
  fr: {
    title: "Donjon des correctifs",
    subtitle: "Un verbe change à chaque salle. Les mots des boutons restent ceux de la première salle. L'ancien geste perd la salle.",
    preparing: "Préparation de la manche.",
    ready: "Lisez la seule ligne. Ne croyez pas la place que le mot montrait.",
    play: "Appuyez sur le bouton qui porte maintenant le verbe demandé.",
    start: "Commencer",
    verb: { step: "Avancer", brace: "Tenir", look: "Regarder" },
    scene: { step: "Le sol est ouvert.", brace: "Quelque chose tombe d'en haut.", look: "Devant, c'est noir." },
    same: "Cette salle suit les mots des boutons.",
    swap: (a, b) => `Échange : ${a} · ${b}`,
    score: (n) => `Salles ${n} / ${ROOMS}`,
    won: "Cinq salles, sans l'ancien geste.",
    lost: "C'était l'ancien geste, ou la salle s'est fermée.",
    again: "Le même donjon",
    best: (n) => `Meilleur nombre ${n}`,
    record: (wins, losses) => `Réussies ${wins} · Ratées ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    left: (n) => `Temps ${n}`,
  },
  es: {
    title: "Mazmorra de parches",
    subtitle: "Cada sala cambia un verbo. Las palabras de los botones siguen siendo las de la primera sala. El control viejo pierde la sala.",
    preparing: "Preparando la ronda.",
    ready: "Lee la única línea. No creas el sitio que la palabra señalaba.",
    play: "Pulsa el botón que ahora tiene el verbo que hace falta.",
    start: "Empezar",
    verb: { step: "Avanzar", brace: "Aguantar", look: "Mirar" },
    scene: { step: "El suelo está abierto.", brace: "Cae algo desde arriba.", look: "Delante está oscuro." },
    same: "Esta sala coincide con las palabras de los botones.",
    swap: (a, b) => `Cambio: ${a} · ${b}`,
    score: (n) => `Salas ${n} / ${ROOMS}`,
    won: "Cinco salas, sin el control viejo.",
    lost: "Ese era el control viejo, o la sala se cerró.",
    again: "La misma mazmorra",
    best: (n) => `Mejor número ${n}`,
    record: (wins, losses) => `Pasadas ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    left: (n) => `Tiempo ${n}`,
  },
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

export default function PatchDungeon({ locale }: { locale: Locale }) {
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
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

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
    if (run?.phase !== "play") return undefined;
    const index = run.index;
    const started = performance.now();
    setRemain(Math.ceil(FUSE_MS / 1000));
    const id = window.setInterval(() => {
      const leftMs = FUSE_MS - (performance.now() - started);
      setRemain(Math.max(0, Math.ceil(leftMs / 1000)));
      if (leftMs > 0) return;
      setRun((current) => {
        if (!current || current.phase !== "play" || current.index !== index) return current;
        return expire(current);
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [run?.phase, run?.index]);

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
      if (event.repeat || runRef.current?.phase !== "play") return;
      const index = ["1", "2", "3"].indexOf(event.key);
      if (index < 0) return;
      event.preventDefault();
      setRun((current) => (current ? press(current, index) : current));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (!run || !dateKey) return;
    const previous = phase.current;
    phase.current = run.phase;
    if (previous === run.phase || (run.phase !== "won" && run.phase !== "lost")) return;
    const key = `${dateKey}:${attempt}`;
    if (!noted.current.has(key)) {
      noted.current.add(key);
      try {
        setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l"));
        setBest(recordBest(GAME_ID, run.index, "score"));
      } catch { /* best-effort */ }
    }
    if (muted || reducedMotion) return;
    const Context = window.AudioContext;
    if (!Context) return;
    if (!audio.current) audio.current = new Context();
    const ctx = audio.current;
    void ctx.resume();
    playTone(ctx, run.phase === "won" ? 620 : 180);
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRemain(Math.ceil(FUSE_MS / 1000));
    setRun(createRun(createPuzzle(seed)));
  };

  const room = run ? run.puzzle.rooms[Math.min(run.index, ROOMS - 1)] : null;
  const patchLine = !room ? "" : room.swapped ? t.swap(t.verb[room.swapped[0]], t.verb[room.swapped[1]]) : t.same;
  const cleared = run ? (run.phase === "won" ? ROOMS : run.index) : 0;

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
        {!run || !dateKey || !room ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.date(dateKey)}</p>
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.score(cleared)}{run.phase === "play" ? ` · ${t.left(remain)}` : ""}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            {run.phase !== "ready" ? <p className="text-sm text-foreground" aria-live="polite">{GLYPH[room.need]} {t.scene[room.need]} {patchLine}</p> : null}
            <div className="grid grid-cols-3 gap-2">
              {VERBS.map((verb, index) => (
                <button
                  key={verb}
                  type="button"
                  disabled={run.phase !== "play"}
                  onClick={() => setRun((current) => (current ? press(current, index) : current))}
                  className="min-h-16 rounded-xl border border-border bg-card text-sm font-bold text-foreground motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {t.verb[verb]}
                </button>
              ))}
            </div>
            {run.phase === "ready" ? (
              <button type="button" onClick={() => setRun((current) => (current ? begin(current) : current))} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.start}</button>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
            ) : null}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}{best?.unit === "score" ? ` · ${t.best(best.value)}` : ""}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
