// The shell stays scrollable. data-game-surface would block the legend on a
// phone (2026-10-20). The track alone ignores page scroll so a swipe is a jump.
// The engine has no clock. The 1.2s beat is only this screen, so a careful
// player can still clear with zero creatures.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getBest, getRecord, recordBest, recordResult, type BestRecord, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import { FAILURE_EATER_SPRITES } from "../../lib/games/sprites";
import {
  BEATS,
  GAME_ID,
  LIVES,
  act,
  begin,
  createLevel,
  createRun,
  type Run,
} from "../../lib/games/failure-eater";

const BEAT_MS = 1200;
const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ready: string;
  play: string;
  start: string;
  jump: string;
  wait: string;
  hurdle: string;
  monster: string;
  open: string;
  fails: (n: number) => string;
  won: string;
  lost: string;
  again: string;
  best: (n: number) => string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "실패를 먹는 괴물",
    subtitle: "빈 칸에서 뛰면 그 칸에 괴물이 생기고, 장애물을 안 뛰면 앞의 빈 칸에 생깁니다.",
    preparing: "판을 준비하는 중입니다.",
    ready: "칸을 본 뒤 시작하세요. 시간이 되면 그 칸에서 기다립니다.",
    play: "장애물과 괴물은 뛰고, 빈 칸은 기다립니다.",
    start: "시작",
    jump: "뛰기",
    wait: "기다리기",
    hurdle: "장애물",
    monster: "괴물",
    open: "빈 칸",
    fails: (n) => `실패 ${n} / ${LIVES}`,
    won: "트랙을 넘었습니다.",
    lost: "세 번 실패해 끝났습니다.",
    again: "같은 판 다시",
    best: (n) => `남긴 기회 ${n}`,
    record: (wins, losses) => `넘김 ${wins} · 먹힘 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
  },
  en: {
    title: "Failure Eater",
    subtitle: "A jump on open ground leaves a creature there. A missed hurdle leaves one on the next open beat.",
    preparing: "Preparing the round.",
    ready: "Read the track, then start. When the beat ends, you wait on that cell.",
    play: "Jump hurdles and creatures. Wait on open ground.",
    start: "Start",
    jump: "Jump",
    wait: "Wait",
    hurdle: "Hurdle",
    monster: "Creature",
    open: "Open",
    fails: (n) => `Misses ${n} / ${LIVES}`,
    won: "You cleared the track.",
    lost: "Three misses end the run.",
    again: "Same track again",
    best: (n) => `Lives left ${n}`,
    record: (wins, losses) => `Cleared ${wins} · Eaten ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
  },
  ja: {
    title: "失敗を食べる怪物",
    subtitle: "空き拍で跳ぶとその拍に怪物が残り、障害を跳ばないと次の空き拍に生まれます。",
    preparing: "盤面を準備しています。",
    ready: "拍を見てから始めてください。時間が来るとその拍で待ちます。",
    play: "障害と怪物は跳び、空きは待ちます。",
    start: "開始",
    jump: "跳ぶ",
    wait: "待つ",
    hurdle: "障害",
    monster: "怪物",
    open: "空き",
    fails: (n) => `失敗 ${n} / ${LIVES}`,
    won: "トラックを越えました。",
    lost: "三回失敗して終わりました。",
    again: "同じ盤でもう一度",
    best: (n) => `残した機会 ${n}`,
    record: (wins, losses) => `越え ${wins} · 食べられ ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
  },
  zh: {
    title: "吃掉失败的怪物",
    subtitle: "在空拍上跳，怪物会留在那一拍。漏过障碍，下一格空拍会长出怪物。",
    preparing: "正在准备这一局。",
    ready: "先看拍子再开始。时间到了就在这一拍等待。",
    play: "障碍和怪物要跳，空拍要等。",
    start: "开始",
    jump: "跳",
    wait: "等",
    hurdle: "障碍",
    monster: "怪物",
    open: "空拍",
    fails: (n) => `失败 ${n} / ${LIVES}`,
    won: "通过了这条跑道。",
    lost: "失败三次，这一局结束。",
    again: "同一盘再来",
    best: (n) => `剩下的机会 ${n}`,
    record: (wins, losses) => `通过 ${wins} · 被吃 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
  },
  fr: {
    title: "Monstre des ratés",
    subtitle: "Un saut sur un temps libre y laisse une créature. Rater un obstacle en pose une sur le temps libre suivant.",
    preparing: "Préparation de la manche.",
    ready: "Lisez la piste, puis commencez. À la fin du temps, vous attendez sur cette case.",
    play: "Sautez les obstacles et les créatures. Attendez sur le sol libre.",
    start: "Commencer",
    jump: "Sauter",
    wait: "Attendre",
    hurdle: "Obstacle",
    monster: "Créature",
    open: "Libre",
    fails: (n) => `Ratés ${n} / ${LIVES}`,
    won: "La piste est franchie.",
    lost: "Trois ratés ferment la manche.",
    again: "La même piste",
    best: (n) => `Chances restantes ${n}`,
    record: (wins, losses) => `Franchies ${wins} · Mangées ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
  },
  es: {
    title: "Monstruo de los fallos",
    subtitle: "Un salto en un tiempo libre deja una criatura ahí. Fallar un obstáculo planta una en el siguiente tiempo libre.",
    preparing: "Preparando la ronda.",
    ready: "Mira la pista y empieza. Al acabar el tiempo, esperas en esa casilla.",
    play: "Salta obstáculos y criaturas. Espera en el suelo libre.",
    start: "Empezar",
    jump: "Saltar",
    wait: "Esperar",
    hurdle: "Obstáculo",
    monster: "Criatura",
    open: "Libre",
    fails: (n) => `Fallos ${n} / ${LIVES}`,
    won: "Has cruzado la pista.",
    lost: "Tres fallos cierran la ronda.",
    again: "La misma pista",
    best: (n) => `Vidas restantes ${n}`,
    record: (wins, losses) => `Cruces ${wins} · Comidos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
  },
};

export default function FailureEater({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [best, setBest] = useState<BestRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef(createHaptics());
  const noted = useRef(new Set<string>());
  const phase = useRef<Run["phase"] | null>(null);
  const point = useRef<{ x: number; y: number } | null>(null);

  const cue = (kind: CoreCue) => {
    if (muted || reducedMotion) return;
    try {
      cuesRef.current ??= createCuePlayer({ cues: CORE_CUES });
      void cuesRef.current.play(kind);
    } catch {
      /* audio blocked */
    }
  };

  useEffect(() => {
    const key = kstDateKey();
    const seed = (dateKeyIndex(key) * 0x9e3779b1) >>> 0;
    setDateKey(key);
    setRun(createRun(createLevel(seed)));
    try {
      setRecord(getRecord(GAME_ID));
      setBest(getBest(GAME_ID));
    } catch { /* storage can be blocked */ }
  }, []);

  const press = (jump: boolean) => {
    cue(jump ? "place" : "tap");
    hapticsRef.current.fire(jump ? "place" : "tap");
    setRun((current) => (current && current.phase === "play" ? act(current, jump) : current));
    setPulse((value) => value + 1);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
      if (event.key === " " || event.key === "ArrowUp") {
        event.preventDefault();
        press(true);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        press(false);
        return;
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        togglePortal();
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setMuted((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [containerRef, togglePortal]);

  useEffect(() => {
    if (run?.phase !== "play") return;
    const id = window.setInterval(() => {
      setRun((current) => (current && current.phase === "play" ? act(current, false) : current));
    }, BEAT_MS);
    return () => window.clearInterval(id);
  }, [run?.phase, pulse]);

  useEffect(() => {
    if (!run || !dateKey) return;
    const previous = phase.current;
    phase.current = run.phase;
    if (previous === run.phase) return;
    if (run.phase !== "won" && run.phase !== "lost") return;
    const key = `${dateKey}:${attempt}`;
    if (!noted.current.has(key)) {
      noted.current.add(key);
      try {
        setRecord(recordResult(GAME_ID, run.phase === "won" ? "w" : "l"));
        if (run.phase === "won") setBest(recordBest(GAME_ID, LIVES - run.fails, "score"));
      } catch { /* best-effort */ }
    }
    if (run.phase === "won") {
      cue("win");
      hapticsRef.current.fire("win");
      if (containerRef.current) celebrate(containerRef.current, { preset: "stardust" });
    } else if (run.phase === "lost") {
      cue("fail");
      hapticsRef.current.fire("fail");
    }
  }, [run, dateKey, attempt, muted, reducedMotion]);

  const handleShareCard = async () => {
    if (!run) return;
    const isWon = run.phase === "won";
    const canvas = createShareCardCanvas({
      title: "Failure Eater",
      subtitle: isWon ? "Mastered the Emotional Beast" : "Devoured by Failure",
      score: isWon ? `Cleared with ${run.fails} Fails` : `${run.fails}/${LIVES} Limit Reached`,
      slug: "failure-eater",
      customStats: [
        { label: "Date", value: dateKey ?? "Today" },
        { label: "Monsters Spawned", value: `${run.monsters.length} Beasts` },
        { label: "Record", value: `${record?.w ?? 0}W - ${record?.l ?? 0}L` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `failure-eater-${dateKey}.png`);
    }
  };

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setRun(createRun(createLevel(seed)));
  };

  const playing = run?.phase === "play";

  return (
    <div ref={containerRef} className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}>
      <GameContainer title={t.title} subtitle={run ? t.subtitle : t.preparing}>
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted">
          <img src={FAILURE_EATER_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.date(dateKey)}</p>
            <p className="text-sm font-bold tabular-nums text-foreground" aria-live="polite">{t.fails(run.fails)}</p>
            <p className="text-sm text-foreground">{run.phase === "won" ? t.won : run.phase === "lost" ? t.lost : run.phase === "play" ? t.play : t.ready}</p>
            <div className="flex flex-wrap gap-3 text-sm text-foreground">
              <span className="inline-flex items-center gap-2"><span className="inline-block size-4 rounded-md border border-border bg-card" />{t.open}</span>
              <span className="inline-flex items-center gap-2"><span className="inline-block size-4 rounded-md bg-foreground/15" />{t.hurdle}</span>
              <span className="inline-flex items-center gap-2"><span className="inline-block size-4 rounded-md bg-warning/30" />{t.monster}</span>
            </div>
            <div
              className="mx-auto grid w-full max-w-sm touch-none grid-cols-5 gap-1 select-none"
              onPointerDown={(event) => { point.current = { x: event.clientX, y: event.clientY }; }}
              onPointerUp={(event) => {
                if (!point.current) return;
                const dx = event.clientX - point.current.x;
                const dy = event.clientY - point.current.y;
                point.current = null;
                if (Math.hypot(dx, dy) < 28 || Math.abs(dy) < Math.abs(dx)) return;
                press(dy < 0);
              }}
            >
              {Array.from({ length: BEATS }, (_, index) => {
                const isCurrent = playing && index === run.cursor;
                const isMonster = run.monsters.includes(index);
                const isHurdle = run.level.beats[index] === "hurdle";
                const tone = isMonster
                  ? "bg-warning/20 text-foreground"
                  : isHurdle
                    ? "bg-foreground/15 text-foreground"
                    : "border border-border bg-card text-foreground";
                return (
                  <div key={index} className={`flex aspect-square items-center justify-center rounded-md text-sm font-black ${isCurrent ? "ring-2 ring-primary" : ""} ${tone}`}>
                    {isMonster ? "●" : isHurdle ? "▴" : isCurrent ? "●" : ""}
                  </div>
                );
              })}
            </div>
            {run.phase === "ready" ? (
              <button
                type="button"
                onClick={() => {
                  cue("tap");
                  hapticsRef.current.fire("tap");
                  setRun(begin(run));
                }}
                className={`${CONTROL} border-primary bg-primary text-primary-foreground`}
              >
                {t.start}
              </button>
            ) : null}
            {playing ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => press(false)} aria-label={t.wait} className={`${CONTROL} border-border bg-card text-foreground`}>{t.wait}</button>
                <button type="button" onClick={() => press(true)} aria-label={t.jump} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.jump}</button>
              </div>
            ) : null}
            {run.phase === "won" || run.phase === "lost" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
                <button
                  type="button"
                  onClick={() => void handleShareCard()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/30 active:scale-95"
                >
                  <Share2 className="size-4" />
                  <span>{shareCopied ? "복사됨!" : "공유 카드"}</span>
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
