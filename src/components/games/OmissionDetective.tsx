// The shell stays scrollable. data-game-surface would block the statement list
// on a phone (2026-10-20). Statements stay on screen; the true route does not,
// until the case is closed.

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { GameContainer } from "../ui/game/GamePrimitives";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import { getRecord, recordResult, type GameRecord } from "../../lib/games/records";
import { dateKeyIndex, kstDateKey } from "../../lib/games/todays-game";
import {
  GAME_ID,
  TRIES,
  createBoard,
  createCase,
  submitOrder,
  togglePlace,
  tray,
  type Board,
  type PlaceId,
} from "../../lib/games/omission-detective";

const CONTROL = "min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

interface Copy {
  title: string;
  subtitle: string;
  preparing: string;
  ask: string;
  witness: (n: number) => string;
  check: string;
  tries: (left: number) => string;
  broken: (n: number) => string;
  open: string;
  won: string;
  lost: string;
  route: string;
  again: string;
  record: (wins: number, losses: number) => string;
  date: (key: string) => string;
  places: Record<PlaceId, string>;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "거짓말 탐정",
    subtitle: "세 사람은 사실만 말했고, 각자 장소를 빠뜨렸습니다. 가능한 순서는 하나입니다.",
    preparing: "판을 준비하는 중입니다.",
    ask: "장소를 눌러 순서를 만들고, 세 문장과 맞는지 확인하세요.",
    witness: (n) => `${n}번`,
    check: "이 순서로 확인",
    tries: (left) => `남은 확인 ${left}`,
    broken: (n) => `${n}번의 말과 순서가 맞지 않습니다.`,
    open: "문장과는 맞지만, 아직 하나의 길이 아닙니다.",
    won: "그 순서만 세 문장을 모두 만족합니다.",
    lost: "확인을 모두 썼습니다. 오늘의 길은 이렇게 이어집니다.",
    route: "오늘의 길",
    again: "같은 사건 다시",
    record: (wins, losses) => `맞춤 ${wins} · 놓침 ${losses}`,
    date: (key) => `${key} · 한국 표준시`,
    places: { market: "시장", school: "학교", park: "공원", station: "역", library: "도서관", hospital: "병원", bridge: "다리", harbor: "항구" },
  },
  en: {
    title: "Omission Detective",
    subtitle: "Three people told the truth and each left places out. Only one order fits.",
    preparing: "Preparing the round.",
    ask: "Tap places into an order, then check it against the three lines.",
    witness: (n) => `${n}`,
    check: "Check this order",
    tries: (left) => `Checks left ${left}`,
    broken: (n) => `Line ${n} does not fit this order.`,
    open: "The lines allow this, but it is not the only route.",
    won: "Only this order fits all three lines.",
    lost: "No checks left. Today's route runs like this.",
    route: "Today's route",
    again: "Same case again",
    record: (wins, losses) => `Solved ${wins} · Missed ${losses}`,
    date: (key) => `${key} · Korea Standard Time`,
    places: { market: "Market", school: "School", park: "Park", station: "Station", library: "Library", hospital: "Hospital", bridge: "Bridge", harbor: "Harbor" },
  },
  ja: {
    title: "省略の探偵",
    subtitle: "三人は本当のことだけを言い、それぞれ場所を省きました。可能な順は一つです。",
    preparing: "盤面を準備しています。",
    ask: "場所を押して順を作り、三つの話と合うか確認します。",
    witness: (n) => `${n}番`,
    check: "この順で確認",
    tries: (left) => `残り確認 ${left}`,
    broken: (n) => `${n}番の話と順が合いません。`,
    open: "話とは合いますが、まだ一つの道ではありません。",
    won: "この順だけが三つの話をすべて満たします。",
    lost: "確認を使い切りました。今日の道はこう続きます。",
    route: "今日の道",
    again: "同じ事件でもう一度",
    record: (wins, losses) => `解明 ${wins} · 見逃し ${losses}`,
    date: (key) => `${key} · 韓国標準時`,
    places: { market: "市場", school: "学校", park: "公園", station: "駅", library: "図書館", hospital: "病院", bridge: "橋", harbor: "港" },
  },
  zh: {
    title: "省略侦探",
    subtitle: "三个人只说了真话，各自漏了地点。能排通的顺序只有一个。",
    preparing: "正在准备这一局。",
    ask: "点地点排好顺序，再和三句话核对。",
    witness: (n) => `${n}`,
    check: "核对这个顺序",
    tries: (left) => `剩余核对 ${left}`,
    broken: (n) => `第${n}句和这个顺序对不上。`,
    open: "这几句都说得通，但还不是唯一的路。",
    won: "只有这个顺序同时满足三句话。",
    lost: "核对次数用完了。今天的路线是这样。",
    route: "今天的路线",
    again: "同一案件再来",
    record: (wins, losses) => `解开 ${wins} · 错过 ${losses}`,
    date: (key) => `${key} · 韩国标准时间`,
    places: { market: "市场", school: "学校", park: "公园", station: "车站", library: "图书馆", hospital: "医院", bridge: "桥", harbor: "港口" },
  },
  fr: {
    title: "Détective des oublis",
    subtitle: "Trois personnes ont dit vrai et chacune a omis des lieux. Un seul ordre convient.",
    preparing: "Préparation de la manche.",
    ask: "Touchez les lieux pour former un ordre, puis vérifiez-le contre les trois phrases.",
    witness: (n) => `${n}`,
    check: "Vérifier cet ordre",
    tries: (left) => `Essais restants ${left}`,
    broken: (n) => `La phrase ${n} ne suit pas cet ordre.`,
    open: "Les phrases l'acceptent, mais ce n'est pas le seul trajet.",
    won: "Seul cet ordre satisfait les trois phrases.",
    lost: "Plus d'essais. Le trajet du jour est celui-ci.",
    route: "Trajet du jour",
    again: "La même affaire",
    record: (wins, losses) => `Résolus ${wins} · Ratés ${losses}`,
    date: (key) => `${key} · heure de Séoul`,
    places: { market: "Marché", school: "École", park: "Parc", station: "Gare", library: "Bibliothèque", hospital: "Hôpital", bridge: "Pont", harbor: "Port" },
  },
  es: {
    title: "Detective de omisiones",
    subtitle: "Tres personas dijeron la verdad y cada una omitió lugares. Solo un orden encaja.",
    preparing: "Preparando la ronda.",
    ask: "Toca los lugares para armar un orden y compruébalo con las tres frases.",
    witness: (n) => `${n}`,
    check: "Comprobar este orden",
    tries: (left) => `Intentos ${left}`,
    broken: (n) => `La frase ${n} no sigue este orden.`,
    open: "Las frases lo permiten, pero no es la única ruta.",
    won: "Solo este orden cumple las tres frases.",
    lost: "No quedan intentos. La ruta de hoy es esta.",
    route: "Ruta de hoy",
    again: "El mismo caso",
    record: (wins, losses) => `Resueltos ${wins} · Fallos ${losses}`,
    date: (key) => `${key} · hora de Seúl`,
    places: { market: "Mercado", school: "Escuela", park: "Parque", station: "Estación", library: "Biblioteca", hospital: "Hospital", bridge: "Puente", harbor: "Puerto" },
  },
};

export default function OmissionDetective({ locale }: { locale: Locale }) {
  const loc = COPY[locale] ? locale : "en";
  const t = COPY[loc];
  const reducedMotion = usePrefersReducedMotion();
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale: loc });
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [muted, setMuted] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const noted = useRef(new Set<string>());
  const phase = useRef<Board["phase"] | null>(null);

  useEffect(() => {
    const key = kstDateKey();
    const seed = (dateKeyIndex(key) * 0x9e3779b1) >>> 0;
    setDateKey(key);
    setBoard(createBoard(createCase(seed)));
    try { setRecord(getRecord(GAME_ID)); } catch { /* storage can be blocked */ }
  }, []);

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
    if (!board || !dateKey) return;
    const previous = phase.current;
    phase.current = board.phase;
    if (previous === board.phase) return;
    if (board.phase === "won" || board.phase === "lost") {
      const key = `${dateKey}:${attempt}`;
      if (!noted.current.has(key)) {
        noted.current.add(key);
        try { setRecord(recordResult(GAME_ID, board.phase === "won" ? "w" : "l")); } catch { /* best-effort */ }
      }
      if (muted || reducedMotion) return;
      const Context = window.AudioContext;
      if (!Context) return;
      if (!audio.current) audio.current = new Context();
      const ctx = audio.current;
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = board.phase === "won" ? 620 : 180;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }
  }, [board, dateKey, attempt, muted, reducedMotion]);

  const again = () => {
    if (!dateKey) return;
    const seed = (dateKeyIndex(dateKey) * 0x9e3779b1) >>> 0;
    setAttempt((value) => value + 1);
    setBoard(createBoard(createCase(seed)));
  };

  const closed = board?.phase === "won" || board?.phase === "lost";

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-y-auto bg-background p-3 sm:p-5" : "relative"}
    >
      <GameContainer title={t.title} subtitle={board ? t.subtitle : t.preparing}>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={muted} aria-label={muted ? portalLabels.unmute : portalLabels.mute} title={`${muted ? portalLabels.unmute : portalLabels.mute} (M)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button type="button" onClick={togglePortal} aria-pressed={isImmersive} aria-label={isImmersive ? portalLabels.exit : portalLabels.enter} title={`${isImmersive ? portalLabels.exit : portalLabels.enter} (F)`} className={`${CONTROL} inline-flex items-center gap-1 border-border bg-card text-muted-foreground`}>
            {isImmersive ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isImmersive ? portalLabels.exit : portalLabels.enter}</span>
          </button>
        </div>
        {!board || !dateKey ? <p className="text-sm text-muted-foreground">{t.preparing}</p> : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.date(dateKey)}</p>
            <p className="text-sm font-bold text-foreground" aria-live="polite">{t.tries(TRIES - board.tries)}</p>
            <p className="text-sm text-foreground">{board.phase === "won" ? t.won : board.phase === "lost" ? t.lost : t.ask}</p>
            <div className="space-y-2">
              {board.daily.lines.map((line, index) => (
                <div key={index} className={`rounded-2xl border p-3 ${board.broken === index ? "border-warning bg-warning/15" : "border-border bg-card"}`}>
                  <p className="mb-2 text-sm font-bold text-foreground">{t.witness(index + 1)}</p>
                  <p className="text-sm text-foreground">{line.map((place) => t.places[place]).join(" → ")}</p>
                </div>
              ))}
            </div>
            {board.broken !== null && board.phase === "ask" ? <p className="text-sm font-bold text-foreground">{t.broken(board.broken + 1)}</p> : null}
            {board.broken === null && board.tries > 0 && board.phase === "ask" ? <p className="text-sm font-bold text-foreground">{t.open}</p> : null}
            <div className="flex flex-wrap gap-2">
              {board.picks.map((place, index) => (
                <button key={`${place}-${index}`} type="button" onClick={() => setBoard(togglePlace(board, place))} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.places[place]}</button>
              ))}
              {Array.from({ length: board.daily.order.length - board.picks.length }, (_, index) => (
                <span key={index} className={`${CONTROL} inline-flex items-center border-dashed border-border text-muted-foreground`}>{board.picks.length + index + 1}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {tray(board.daily).map((place) => {
                const picked = board.picks.includes(place);
                return (
                  <button key={place} type="button" disabled={closed} aria-pressed={picked} onClick={() => setBoard(togglePlace(board, place))} className={`${CONTROL} ${picked ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card text-foreground"} disabled:opacity-40`}>{t.places[place]}</button>
                );
              })}
            </div>
            {board.phase === "ask" ? (
              <button type="button" disabled={board.picks.length !== board.daily.order.length} onClick={() => setBoard(submitOrder(board))} className={`${CONTROL} border-primary bg-primary text-primary-foreground disabled:opacity-40`}>{t.check}</button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-bold text-foreground">{t.route}</p>
                <p className="text-sm text-foreground">{board.daily.order.map((place) => t.places[place]).join(" → ")}</p>
                <button type="button" onClick={again} className={`${CONTROL} border-primary bg-primary text-primary-foreground`}>{t.again}</button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{t.record(record?.w ?? 0, record?.l ?? 0)}</p>
          </div>
        )}
      </GameContainer>
    </div>
  );
}
