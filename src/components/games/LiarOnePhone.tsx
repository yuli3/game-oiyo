// One-phone liar. The shell stays scrollable: data-game-surface would set
// touch-action:none and block the pass-the-phone screen (2026-10-20).
// Seats are numbers. Names are not collected or stored.

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import { CORE_CUES, createCuePlayer, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics } from "../../lib/games/haptics";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import { LIAR_ONEPHONE_SPRITES } from "../../lib/games/sprites";
import {
  GAME_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  beginVote,
  castVote,
  createRound,
  guessWord,
  hide,
  ready,
  revealedWord,
  startSession,
  visibleCard,
  type LiarMode,
  type Session,
} from "../../lib/games/liar-onephone";

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const MINUTES = [1, 3, 5] as const;
const MODES: readonly LiarMode[] = ["classic", "pair", "decoy", "silent"];

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  players: string;
  variant: string;
  classic: string;
  pair: string;
  decoy: string;
  silent: string;
  minutes: string;
  enter: string;
  seat: (n: number) => string;
  cover: string;
  look: string;
  hide: string;
  discuss: string;
  voteStart: string;
  voteCover: string;
  voteHint: string;
  guessHint: string;
  category: string;
  word: string;
  decoySeen: string;
  groupWin: string;
  liarWin: string;
  again: string;
  record: (wins: number, losses: number) => string;
  timeUp: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "라이어 한 폰",
    subtitle: "폰을 돌려 제시어를 확인하고, 이야기한 뒤 라이어를 찾으세요.",
    preparing: "판을 준비하는 중입니다.",
    players: "인원",
    variant: "판",
    classic: "한 명",
    pair: "라이어 2명",
    decoy: "다른 제시어",
    silent: "침묵",
    minutes: "토론",
    enter: "입장하기",
    seat: (n) => `${n}번`,
    cover: "옆 사람이 화면을 보지 않는지 확인하고 넘기세요.",
    look: "내 카드 보기",
    hide: "가리고 넘기기",
    discuss: "모두 봤습니다. 제시어를 직접 말하지 말고 이야기하세요.",
    voteStart: "투표 시작",
    voteCover: "투표할 사람에게 폰을 넘기세요.",
    voteHint: "라이어라고 생각하는 번호를 고르세요.",
    guessHint: "지목되었습니다. 제시어를 고르세요.",
    category: "분류",
    word: "제시어",
    decoySeen: "라이어가 본 말",
    groupWin: "라이어를 찾았고, 제시어도 막았습니다.",
    liarWin: "라이어가 이겼습니다.",
    again: "다음 판",
    record: (wins, losses) => `잡음 ${wins} · 놓침 ${losses}`,
    timeUp: "토론 시간이 끝났습니다.",
  },
  en: {
    title: "One-Phone Liar",
    subtitle: "Pass one phone, check the secret, talk, then find the liar.",
    preparing: "Preparing the round.",
    players: "Players",
    variant: "Round",
    classic: "One liar",
    pair: "Two liars",
    decoy: "Another word",
    silent: "Silent round",
    minutes: "Talk",
    enter: "Enter",
    seat: (n) => `Seat ${n}`,
    cover: "Pass the phone only when nobody else can see the screen.",
    look: "Show my card",
    hide: "Hide and pass",
    discuss: "Everyone has looked. Talk without saying the secret word.",
    voteStart: "Start the vote",
    voteCover: "Pass the phone to the next voter.",
    voteHint: "Choose the seat you think is the liar.",
    guessHint: "You were chosen. Pick the secret word.",
    category: "Category",
    word: "Secret",
    decoySeen: "The liar's word",
    groupWin: "The group found the liar and blocked the word.",
    liarWin: "The liar wins.",
    again: "Next round",
    record: (wins, losses) => `Caught ${wins} · Missed ${losses}`,
    timeUp: "Talk time is over.",
  },
  ja: {
    title: "一台ライアー",
    subtitle: "一台の電話を回して提示語を見て、話してからライアーを探します。",
    preparing: "盤面を準備しています。",
    players: "人数",
    variant: "盤",
    classic: "一人",
    pair: "ライアー2人",
    decoy: "別の提示語",
    silent: "沈黙",
    minutes: "相談",
    enter: "入る",
    seat: (n) => `${n}番`,
    cover: "ほかの人に画面が見えないことを確かめてから渡します。",
    look: "自分のカードを見る",
    hide: "隠して渡す",
    discuss: "全員見ました。提示語そのものは言わずに話します。",
    voteStart: "投票を始める",
    voteCover: "次に投票する人へ電話を渡します。",
    voteHint: "ライアーだと思う番号を選びます。",
    guessHint: "指名されました。提示語を選んでください。",
    category: "分類",
    word: "提示語",
    decoySeen: "ライアーが見た語",
    groupWin: "ライアーを見つけ、提示語も止めました。",
    liarWin: "ライアーの勝ちです。",
    again: "次の盤",
    record: (wins, losses) => `発見 ${wins} · 逃す ${losses}`,
    timeUp: "相談の時間が終わりました。",
  },
  zh: {
    title: "一机说谎者",
    subtitle: "传一部手机看提示词，讨论之后找出说谎者。",
    preparing: "正在准备这一局。",
    players: "人数",
    variant: "局面",
    classic: "一人",
    pair: "两个说谎者",
    decoy: "另一个提示词",
    silent: "沉默",
    minutes: "讨论",
    enter: "进入",
    seat: (n) => `${n}号`,
    cover: "确认旁边的人看不到屏幕，再把手机递过去。",
    look: "看我的卡",
    hide: "遮住并传递",
    discuss: "大家都看过了。讨论时不要直接说出提示词。",
    voteStart: "开始投票",
    voteCover: "把手机递给下一位投票的人。",
    voteHint: "选出你认为的说谎者号码。",
    guessHint: "你被指认了。请选出提示词。",
    category: "分类",
    word: "提示词",
    decoySeen: "说谎者看到的词",
    groupWin: "找出了说谎者，也挡住了提示词。",
    liarWin: "说谎者赢了。",
    again: "下一局",
    record: (wins, losses) => `抓到 ${wins} · 放走 ${losses}`,
    timeUp: "讨论时间到了。",
  },
  fr: {
    title: "Menteur, un téléphone",
    subtitle: "Passez un téléphone, lisez le mot, parlez, puis trouvez le menteur.",
    preparing: "Préparation de la manche.",
    players: "Joueurs",
    variant: "Manche",
    classic: "Un menteur",
    pair: "Deux menteurs",
    decoy: "Un autre mot",
    silent: "Silence",
    minutes: "Débat",
    enter: "Entrer",
    seat: (n) => `Place ${n}`,
    cover: "Passez le téléphone seulement si personne d'autre ne voit l'écran.",
    look: "Voir ma carte",
    hide: "Cacher et passer",
    discuss: "Tout le monde a regardé. Parlez sans dire le mot secret.",
    voteStart: "Commencer le vote",
    voteCover: "Passez le téléphone au votant suivant.",
    voteHint: "Choisissez la place du menteur.",
    guessHint: "Vous êtes désigné. Choisissez le mot secret.",
    category: "Catégorie",
    word: "Mot secret",
    decoySeen: "Le mot du menteur",
    groupWin: "Le groupe a trouvé le menteur et bloqué le mot.",
    liarWin: "Le menteur gagne.",
    again: "Manche suivante",
    record: (wins, losses) => `Trouvé ${wins} · Manqué ${losses}`,
    timeUp: "Le temps de parole est fini.",
  },
  es: {
    title: "Mentiroso de un móvil",
    subtitle: "Pasad un móvil, mirad la palabra, hablad y encontrad al mentiroso.",
    preparing: "Preparando la ronda.",
    players: "Jugadores",
    variant: "Ronda",
    classic: "Un mentiroso",
    pair: "Dos mentirosos",
    decoy: "Otra palabra",
    silent: "Silencio",
    minutes: "Debate",
    enter: "Entrar",
    seat: (n) => `Puesto ${n}`,
    cover: "Pasa el móvil solo cuando nadie más pueda ver la pantalla.",
    look: "Ver mi carta",
    hide: "Tapar y pasar",
    discuss: "Todos han mirado. Hablad sin decir la palabra secreta.",
    voteStart: "Empezar la votación",
    voteCover: "Pasa el móvil a quien vota ahora.",
    voteHint: "Elige el puesto que crees que es el mentiroso.",
    guessHint: "Te han señalado. Elige la palabra secreta.",
    category: "Categoría",
    word: "Palabra",
    decoySeen: "La palabra del mentiroso",
    groupWin: "El grupo encontró al mentiroso y tapó la palabra.",
    liarWin: "Gana el mentiroso.",
    again: "Siguiente ronda",
    record: (wins, losses) => `Aciertos ${wins} · Fallos ${losses}`,
    timeUp: "Se acabó el tiempo de hablar.",
  },
};

function clock(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function LiarOnePhone({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [seedBase, setSeedBase] = useState<number | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [playerCount, setPlayerCount] = useState(4);
  const [mode, setMode] = useState<LiarMode>("classic");
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>(3);
  const [session, setSession] = useState<Session | null>(null);
  const [left, setLeft] = useState(180);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const cuesRef = useRef<CuePlayer<CoreCue> | null>(null);
  const hapticsRef = useRef<ReturnType<typeof createHaptics> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());

  const cue = (kind: CoreCue) => {
    if (!muted) {
      cuesRef.current ??= createCuePlayer({ cues: CORE_CUES });
      cuesRef.current.play(kind);
    }
    hapticsRef.current ??= createHaptics();
    if (kind === "tap") hapticsRef.current.fire("tap");
    else if (kind === "place") hapticsRef.current.fire("place");
    else if (kind === "combo") hapticsRef.current.fire("combo");
    else if (kind === "fail") hapticsRef.current.fire("fail");
    else if (kind === "win") hapticsRef.current.fire("win");
  };

  useEffect(() => {
    const dateKey = kstDateKey();
    setSeedBase((dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0);
    try { setRecord(getRecord(GAME_ID)); } catch { /* storage can be blocked */ }
  }, [loc]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || !(event.target instanceof Node) || !root.contains(event.target)) return;
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
    if (!session || session.phase !== "discuss") return;
    const id = window.setInterval(() => setLeft((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (!session || session.phase !== "result" || !session.winner) return;
    const key = `${loc}:${session.round.seed}`;
    if (noted.current.has(key)) return;
    noted.current.add(key);
    try { setRecord(recordResult(GAME_ID, session.winner === "group" ? "w" : "l")); } catch { /* best-effort */ }
    cue("win");
    const isGroup = session.winner === "group";
    celebrate(containerRef.current, {
      preset: isGroup ? "stardust" : "sparks",
      colors: isGroup ? ["#38bdf8", "#fbbf24", "#34d399"] : ["#ef4444", "#f97316", "#fbbf24"],
      label: isGroup ? t.groupWin : t.liarWin,
    });
  }, [session, loc, muted, reducedMotion]);

  const begin = () => {
    if (seedBase === null) return;
    const round = createRound((seedBase + roundIndex) >>> 0, playerCount, loc, mode);
    setSession(startSession(round));
    setLeft(minutes * 60);
  };

  const enter = () => {
    if (!isImmersive) togglePortal();
    begin();
  };

  const again = () => {
    setRoundIndex((value) => value + 1);
    setSession(null);
  };

  const [shareCardCopied, setShareCardCopied] = useState(false);

  const handleShareCard = useCallback(async () => {
    if (!session || !session.winner) return;
    try {
      const isGroupWin = session.winner === "group";
      const canvas = createShareCardCanvas({
        title: t.title,
        subtitle: `${isGroupWin ? t.groupWin : t.liarWin} · ${t[mode]}`,
        score: isGroupWin ? "CITIZEN WIN" : "LIAR WIN",
        slug: "liar-onephone",
        customStats: [
          { label: "WORD", value: session.round.word },
          { label: "CATEGORY", value: session.round.category },
          { label: "PLAYERS", value: `${session.round.playerCount}P` },
        ],
      });
      const success = await copyShareCardToClipboard(canvas);
      if (success) {
        setShareCardCopied(true);
        setTimeout(() => setShareCardCopied(false), 2000);
      } else {
        downloadShareCard(canvas, `liar-onephone-${session.winner}.png`);
      }
    } catch {}
  }, [mode, session, t]);

  const card = session ? visibleCard(session) : "hidden";
  const seat = session ? t.seat(session.cursor + 1) : "";

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}
    >
      <GameContainer title={t.title} subtitle={seedBase === null ? t.preparing : t.subtitle}>
        {!isImmersive && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <img src={LIAR_ONEPHONE_SPRITES.keyart} alt={t.title} className="h-32 w-full object-cover sm:h-44" />
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
        {seedBase === null ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : !session ? (
          <div className="space-y-4" data-liar-phase="setup" data-liar-mode={mode}>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            <p className="text-sm font-bold text-foreground">{t.players}</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, index) => MIN_PLAYERS + index).map((count) => (
                <button key={count} type="button" aria-pressed={playerCount === count} onClick={() => setPlayerCount(count)} className={`${CONTROL} ${playerCount === count ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>{count}</button>
              ))}
            </div>
            <p className="text-sm font-bold text-foreground">{t.variant}</p>
            <div className="flex flex-wrap gap-2">
              {MODES.map((item) => (
                <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)} className={`${CONTROL} ${mode === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>{t[item]}</button>
              ))}
            </div>
            <p className="text-sm font-bold text-foreground">{t.minutes}</p>
            <div className="flex flex-wrap gap-2">
              {MINUTES.map((minute) => (
                <button key={minute} type="button" aria-pressed={minutes === minute} onClick={() => setMinutes(minute)} className={`${CONTROL} ${minutes === minute ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>{minute}</button>
              ))}
            </div>
            <button type="button" onClick={enter} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.enter}</button>
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}</p>
          </div>
        ) : (
          <div className="space-y-4" data-liar-phase={session.phase} data-liar-mode={session.round.mode}>
            {(session.phase === "cover" || session.phase === "voteCover") && (
              <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                <p className="text-lg font-bold text-foreground">{seat}</p>
                <p className="text-sm text-muted-foreground">{session.phase === "cover" ? t.cover : t.voteCover}</p>
                <button type="button" onClick={() => { cue("tap"); setSession(ready(session)); }} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.look}</button>
              </div>
            )}
            {session.phase === "peek" && card === "word" && (
              <div className="space-y-4 rounded-2xl border border-chart-1 bg-chart-1/15 p-4">
                <p className="text-sm font-bold text-foreground">{seat} · {t.word}</p>
                <p className="text-2xl font-bold text-foreground">{revealedWord(session)}</p>
                <p className="text-sm text-muted-foreground">{t.category}: {session.round.category}</p>
                <button type="button" onClick={() => { cue("place"); setSession(hide(session)); }} className={`${CONTROL} border-border bg-card text-foreground`}>{t.hide}</button>
              </div>
            )}
            {session.phase === "peek" && card === "category" && (
              <div className="space-y-4 rounded-2xl border border-warning bg-warning/15 p-4">
                <p className="text-sm font-bold text-foreground">{seat} · {t.category}</p>
                <p className="text-2xl font-bold text-foreground">{session.round.category}</p>
                <button type="button" onClick={() => { cue("place"); setSession(hide(session)); }} className={`${CONTROL} border-border bg-card text-foreground`}>{t.hide}</button>
              </div>
            )}
            {session.phase === "discuss" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t.discuss}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums" aria-live="polite">{clock(left)}</p>
                {left === 0 ? <p className="text-sm font-bold text-foreground">{t.timeUp}</p> : null}
                <button type="button" onClick={() => { cue("tap"); setSession(beginVote(session)); }} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.voteStart}</button>
              </div>
            )}
            {session.phase === "vote" && (
              <div className="space-y-4">
                <p className="text-lg font-bold text-foreground">{seat}</p>
                <p className="text-sm text-muted-foreground">{t.voteHint}</p>
                <div className="flex flex-wrap gap-2">
                  {session.votes.map((_, index) => (
                    <button key={index} type="button" onClick={() => { cue("place"); setSession(castVote(session, index)); }} className={`${CONTROL} border-border bg-card text-foreground`}>{t.seat(index + 1)}</button>
                  ))}
                </div>
              </div>
            )}
            {session.phase === "guess" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t.guessHint}</p>
                <p className="text-sm font-bold text-foreground">{t.category}: {session.round.category}</p>
                <div className="flex flex-wrap gap-2">
                  {session.round.choices.map((word) => (
                    <button key={word} type="button" onClick={() => { cue("place"); setSession(guessWord(session, word)); }} className={`${CONTROL} border-border bg-card text-foreground`}>{word}</button>
                  ))}
                </div>
              </div>
            )}
            {session.phase === "result" && session.winner && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-foreground" aria-live="polite">{session.winner === "group" ? t.groupWin : t.liarWin}</p>
                <p className="text-sm text-foreground">{t.word}: {session.round.word}</p>
                {session.round.decoy ? <p className="text-sm text-foreground">{t.decoySeen}: {session.round.decoy}</p> : null}
                <p className="text-sm text-foreground">{t.category}: {session.round.category}</p>
                <p className="text-sm text-foreground">{session.round.liars.map((seat) => t.seat(seat + 1)).join(" · ")}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
                  <button
                    type="button"
                    onClick={handleShareCard}
                    className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-foreground hover:bg-muted`}
                  >
                    <Share2 className="size-4" />
                    {shareCardCopied ? "카피 완료!" : "Share Card 2.0"}
                  </button>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
