import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, RotateCcw, Users, Bot } from "lucide-react";
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
  AI_LEVELS,
  DONE,
  HOME,
  PIECES,
  YUT_SLUG,
  aiMove,
  applyMove,
  applyThrow,
  canThrow,
  createState,
  destination,
  legalMoves,
  stackAt,
  throwFrom,
  type Move,
  type Throw,
  type YutState,
} from "../../lib/games/yut-nori";
import { STEP_MS, YUT_H, YUT_W, drawYut, facesFor, stationAt, type Anim, type ThrowAnim } from "../../lib/games/yut-nori-draw";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
type Mode = "ai" | "duo";

interface Copy {
  throws: Record<Throw, string>;
  teams: [string, string];
  you: string;
  rivals: string[];
  vs: string;
  modeAi: string;
  modeDuo: string;
  throw: string;
  again: string;
  pick: string;
  enter: string;
  moveStack: string;
  moveOne: string;
  thinking: string;
  turnOf: string;
  home: string;
  done: string;
  capture: string;
  won: string;
  lost: string;
  duoWon: string;
  next: string;
  retry: string;
  finale: string;
  stages: string;
  intro: string;
  passed: string;
  full: string;
  exitFull: string;
  mute: string;
  unmute: string;
}

const COPY: Record<L, Copy> = {
  ko: {
    throws: { backdo: "빽도", do: "도", gae: "개", geol: "걸", yut: "윷", mo: "모" },
    teams: ["청팀", "홍팀"], you: "나 (청팀)",
    rivals: ["옆집 꼬마", "사촌 동생", "막내 삼촌", "이모", "큰아버지", "고모부", "동네 이장님", "장터 윷 장사", "윷판 고수", "전설의 할머니"],
    vs: "{0}단계 · {1}", modeAi: "AI 사다리 10단계", modeDuo: "한 폰 둘이서", throw: "윷 던지기", again: "한 번 더 던지기!", pick: "어떤 결과를 쓸까요?",
    enter: "새 말 놓기 (남은 {0})", moveStack: "{0}개 업힌 말 옮기기", moveOne: "말 옮기기", thinking: "{0} 생각 중…", turnOf: "{0} 차례",
    home: "대기 {0}", done: "골인 {0}", capture: "잡았다!", won: "승리! {0} 님을 이겼어요", lost: "졌어요. {0} 님이 이겼어요", duoWon: "{0} 승리!",
    next: "다음 상대", retry: "다시 하기", finale: "10단계 모두 이겼어요! 처음부터 다시", stages: "상대 고르기",
    intro: "윷을 던지고, 나온 칸 수만큼 말을 옮겨요. 윷·모가 나오거나 상대 말을 잡으면 한 번 더! 모서리에 멈추면 지름길로 갈 수 있어요. 말 4개가 먼저 참먹이를 지나면 이깁니다.",
    passed: "움직일 말이 없어 차례가 넘어갔어요", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    throws: { backdo: "Back-do −1", do: "Do 1", gae: "Gae 2", geol: "Geol 3", yut: "Yut 4", mo: "Mo 5" },
    teams: ["Blue", "Red"], you: "You (Blue)",
    rivals: ["Kid next door", "Little cousin", "Youngest uncle", "Auntie", "Big uncle", "Uncle-in-law", "Village head", "Market yut seller", "Yut master", "Legendary grandma"],
    vs: "Level {0} · {1}", modeAi: "10-level AI ladder", modeDuo: "2 players, one phone", throw: "Throw the sticks", again: "Throw again!", pick: "Which result do you use?",
    enter: "Bring in a new piece ({0} left)", moveStack: "Move the stack of {0}", moveOne: "Move piece", thinking: "{0} is thinking…", turnOf: "{0}'s turn",
    home: "Waiting {0}", done: "Home {0}", capture: "Captured!", won: "You win! You beat {0}", lost: "You lost. {0} wins", duoWon: "{0} wins!",
    next: "Next opponent", retry: "Play again", finale: "All 10 beaten! Start again", stages: "Pick an opponent",
    intro: "Throw the four sticks and move a piece that many stations. Yut, Mo or a capture gives another throw! Stop on a corner to take the short cut. Get all 4 pieces past the start first to win.",
    passed: "No piece could move, so the turn passed", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
  },
  ja: {
    throws: { backdo: "ペクト −1", do: "ト 1", gae: "ケ 2", geol: "コル 3", yut: "ユッ 4", mo: "モ 5" },
    teams: ["青チーム", "赤チーム"], you: "わたし (青)",
    rivals: ["となりの子", "いとこ", "末っ子のおじさん", "おばさん", "大おじさん", "義理のおじさん", "村長さん", "市場のユッ売り", "ユンノリ名人", "伝説のおばあちゃん"],
    vs: "{0}段 · {1}", modeAi: "AIはしご10段", modeDuo: "1台で2人対戦", throw: "ユッを投げる", again: "もう一回投げよう！", pick: "どの結果を使う？",
    enter: "新しいコマを出す (残り{0})", moveStack: "{0}個重なったコマを動かす", moveOne: "コマを動かす", thinking: "{0}が考え中…", turnOf: "{0}の番",
    home: "待機 {0}", done: "ゴール {0}", capture: "つかまえた！", won: "勝ち！{0}に勝ちました", lost: "負け。{0}の勝ち", duoWon: "{0}の勝ち！",
    next: "次の相手", retry: "もう一度", finale: "10段すべて勝利！最初から", stages: "相手を選ぶ",
    intro: "4本のユッを投げ、出た数だけコマを進めます。ユッ・モや相手のコマを取るともう一回！角で止まると近道できます。4つのコマが先にスタート地点を通り過ぎたら勝ち。",
    passed: "動かせるコマがないので番が移りました", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
  },
  zh: {
    throws: { backdo: "退都 −1", do: "都 1", gae: "开 2", geol: "杰 3", yut: "尤 4", mo: "模 5" },
    teams: ["蓝队", "红队"], you: "我 (蓝队)",
    rivals: ["隔壁小孩", "表弟", "小叔叔", "阿姨", "大伯", "姑父", "村长", "集市上的尤茨摊主", "尤茨高手", "传说中的奶奶"],
    vs: "第{0}级 · {1}", modeAi: "AI 十级天梯", modeDuo: "一部手机双人对战", throw: "掷尤茨", again: "再掷一次！", pick: "用哪个结果？",
    enter: "放出新棋子 (剩 {0})", moveStack: "移动叠在一起的 {0} 个棋子", moveOne: "移动棋子", thinking: "{0} 思考中…", turnOf: "轮到{0}",
    home: "待命 {0}", done: "到家 {0}", capture: "吃掉了！", won: "胜利！你赢了{0}", lost: "输了，{0}获胜", duoWon: "{0}获胜！",
    next: "下一个对手", retry: "再玩一次", finale: "十级全部击败！从头再来", stages: "选择对手",
    intro: "掷出四根尤茨棍，按点数移动棋子。掷出尤、模或吃掉对方棋子可以再掷一次！停在角上可以走捷径。4个棋子先绕过起点的一方获胜。",
    passed: "没有可以移动的棋子，轮到对方", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    throws: { backdo: "Back-do −1", do: "Do 1", gae: "Gae 2", geol: "Geol 3", yut: "Yut 4", mo: "Mo 5" },
    teams: ["Bleus", "Rouges"], you: "Vous (Bleus)",
    rivals: ["Le petit voisin", "Le petit cousin", "Le jeune oncle", "La tante", "Le grand oncle", "L'oncle par alliance", "Le chef du village", "Le marchand de yut", "Le maître du yut", "La grand-mère légendaire"],
    vs: "Niveau {0} · {1}", modeAi: "Échelle IA en 10 niveaux", modeDuo: "2 joueurs, un téléphone", throw: "Lancer les bâtons", again: "Relancez !", pick: "Quel résultat utiliser ?",
    enter: "Entrer un pion ({0} restants)", moveStack: "Déplacer la pile de {0}", moveOne: "Déplacer le pion", thinking: "{0} réfléchit…", turnOf: "Au tour de {0}",
    home: "En attente {0}", done: "Arrivés {0}", capture: "Capturé !", won: "Gagné ! Vous avez battu {0}", lost: "Perdu. {0} gagne", duoWon: "{0} gagnent !",
    next: "Adversaire suivant", retry: "Rejouer", finale: "Les 10 battus ! Recommencer", stages: "Choisir un adversaire",
    intro: "Lancez les quatre bâtons et avancez un pion d'autant de cases. Yut, Mo ou une capture donnent un lancer de plus ! Arrêtez-vous sur un coin pour prendre le raccourci. Faites passer vos 4 pions par le départ en premier.",
    passed: "Aucun pion ne pouvait bouger, le tour passe", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    throws: { backdo: "Back-do −1", do: "Do 1", gae: "Gae 2", geol: "Geol 3", yut: "Yut 4", mo: "Mo 5" },
    teams: ["Azules", "Rojos"], you: "Tú (Azules)",
    rivals: ["El niño vecino", "El primito", "El tío joven", "La tía", "El tío mayor", "El tío político", "El jefe del pueblo", "El vendedor de yut", "El maestro del yut", "La abuela legendaria"],
    vs: "Nivel {0} · {1}", modeAi: "Escalera de IA de 10 niveles", modeDuo: "2 jugadores, un móvil", throw: "Lanzar los palos", again: "¡Lanza otra vez!", pick: "¿Qué resultado usas?",
    enter: "Sacar ficha nueva (quedan {0})", moveStack: "Mover la pila de {0}", moveOne: "Mover ficha", thinking: "{0} está pensando…", turnOf: "Turno de {0}",
    home: "Esperando {0}", done: "En casa {0}", capture: "¡Capturada!", won: "¡Ganaste! Venciste a {0}", lost: "Perdiste. Gana {0}", duoWon: "¡Ganan los {0}!",
    next: "Siguiente rival", retry: "Jugar otra vez", finale: "¡Los 10 vencidos! Empezar de nuevo", stages: "Elegir rival",
    intro: "Lanza los cuatro palos y mueve una ficha esas casillas. ¡Yut, Mo o una captura dan otro lanzamiento! Para en una esquina para tomar el atajo. Gana quien pase primero sus 4 fichas por la salida.",
    passed: "Ninguna ficha podía moverse; pasa el turno", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:yut-nori:muted";
const THROW_MS = 750;
const AI_PAUSE = 650;

export default function YutNori({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [mode, setMode] = useState<Mode>("ai");
  const [level, setLevel] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [state, setState] = useState<YutState>(createState);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const shake = useRef<Shake>(createShake({ reducedMotion: () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches }));
  const anim = useRef<Anim | null>(null);
  const throwAnim = useRef<ThrowAnim | null>(null);
  const lastFaces = useRef<boolean[] | null>(null);
  const label = useRef<{ text: string; at: number } | null>(null);
  const seed = useRef(1);
  const gameId = useRef(0);

  const ai = mode === "ai";
  const rivalName = c.rivals[level];
  const names: [string, string] = ai ? [c.you, rivalName] : c.teams;
  const humanTurn = !ai || state.turn === 0;
  const finished = state.winner !== null;
  const iWon = ai && state.winner === 0;
  const margin = state.pieces[1].filter((p) => p.pos !== DONE).length;
  useRunRecord(YUT_SLUG, iWon, iWon ? (level + 1) * 100 + margin * 25 : 0);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const reset = useCallback((nextMode: Mode, nextLevel: number) => {
    gameId.current += 1;
    anim.current = null;
    throwAnim.current = null;
    label.current = null;
    seed.current = Math.floor(Math.random() * 1e6) + 1;
    setMode(nextMode);
    setLevel(nextLevel);
    setState(createState());
    setSel(0);
    setBusy(false);
    setNote(null);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(YUT_SLUG, AI_LEVELS);
    setCleared(done);
    reset("ai", nextOpenStage(done, AI_LEVELS));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: CORE_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [reset]);

  /** After a state change: announce a passed turn, a win, keep the selected throw valid. */
  const commit = useCallback((prev: YutState, next: YutState, kind: "throw" | "move") => {
    // the turn only changes early when a thrown result could not be used
    if (next.turn !== prev.turn && next.winner === null && (kind === "throw" || prev.pending.length > 1)) setNote(c.passed);
    if (next.winner !== null && prev.winner === null) {
      if (ai && next.winner === 0) {
        setCleared(markStageCleared(YUT_SLUG, level, AI_LEVELS));
        sfx("win");
      } else if (ai) sfx("lose");
      else sfx("win");
    }
    setSel(0);
    setState(next);
  }, [ai, c.passed, level, sfx]);

  const doThrow = useCallback(() => {
    const s = stateRef.current;
    if (!canThrow(s) || busy) return;
    const id = gameId.current;
    seed.current = (seed.current * 1103515245 + 12345) % 2147483647;
    const t = throwFrom((seed.current % 100000) / 100000);
    const faces = facesFor(t, seed.current);
    throwAnim.current = { start: performance.now(), faces, duration: THROW_MS };
    setBusy(true);
    setNote(null);
    sfx("tap");
    window.setTimeout(() => {
      if (id !== gameId.current) return;
      throwAnim.current = null;
      lastFaces.current = faces;
      label.current = { text: c.throws[t].split(" ")[0] + (t === "yut" || t === "mo" ? "!" : ""), at: performance.now() };
      if (t === "yut" || t === "mo") {
        sfx("combo");
        shake.current.kick(JUICE.shake.light);
      }
      const prev = stateRef.current;
      commit(prev, applyThrow(prev, t), "throw");
      setBusy(false);
    }, THROW_MS);
  }, [busy, c.throws, commit, sfx]);

  const doMove = useCallback((m: Move) => {
    const s = stateRef.current;
    if (busy || s.throwsLeft > 0) return;
    const t = s.pending[m.throwIndex];
    const lead = s.pieces[s.turn][m.piece];
    const dest = t ? destination(lead, t) : null;
    if (!dest) return;
    const group = lead.pos === HOME ? [m.piece] : stackAt(s, s.turn, lead.pos);
    const id = gameId.current;
    anim.current = { player: s.turn, pieces: group, path: dest.path, from: lead.pos, start: performance.now() };
    const next = applyMove(s, m);
    setBusy(true);
    window.setTimeout(() => {
      if (id !== gameId.current) return;
      anim.current = null;
      if (next.lastCapture > s.lastCapture) {
        label.current = { text: c.capture, at: performance.now() };
        sfx("combo");
        shake.current.kick(JUICE.shake.heavy * 0.7, 220);
      } else if (dest.pos === DONE) sfx("success");
      else sfx("place");
      commit(s, next, "move");
      setBusy(false);
    }, dest.path.length * STEP_MS + 40);
  }, [busy, c.capture, commit, sfx]);

  // AI turns
  useEffect(() => {
    if (!ai || state.turn !== 1 || state.winner !== null || busy) return;
    const id = gameId.current;
    const timer = window.setTimeout(() => {
      if (id !== gameId.current) return;
      const s = stateRef.current;
      if (canThrow(s)) doThrow();
      else {
        const m = aiMove(s, level + 1, seed.current + s.log.length);
        if (m) doMove(m);
      }
    }, AI_PAUSE);
    return () => window.clearTimeout(timer);
  }, [ai, busy, doMove, doThrow, level, state]);

  // render loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const s = stateRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      const moves = !busy && s.throwsLeft === 0 && (!ai || s.turn === 0) ? legalMoves(s).filter((m) => m.throwIndex === Math.min(sel, s.pending.length - 1)) : [];
      const t = s.pending[Math.min(sel, s.pending.length - 1)];
      if (ctx) {
        drawYut(ctx, s, {
          now,
          shake: shake.current.sample(dt),
          highlights: t ? moves.map((m) => destination(s.pieces[s.turn][m.piece], t)?.pos ?? HOME).filter((p) => p !== HOME) : [],
          sources: moves.map((m) => s.pieces[s.turn][m.piece].pos),
          anim: anim.current,
          throwAnim: throwAnim.current,
          lastFaces: lastFaces.current,
          label: label.current?.text ?? null,
          labelAt: label.current?.at ?? 0,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ai, busy, sel]);

  const selIndex = Math.min(sel, Math.max(0, state.pending.length - 1));
  const canAct = humanTurn && !busy && !finished;
  const moves = canAct && state.throwsLeft === 0 ? legalMoves(state).filter((m) => m.throwIndex === selIndex) : [];

  const onCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * YUT_W;
    const y = ((e.clientY - rect.top) / rect.height) * YUT_H;
    if (canAct && canThrow(state) && y > 600) return doThrow();
    if (!moves.length) return;
    const st = stationAt(x, y);
    if (st === null) return;
    const t = state.pending[selIndex];
    const pick = moves.find((m) => state.pieces[state.turn][m.piece].pos === st) ??
      moves.find((m) => destination(state.pieces[state.turn][m.piece], t)?.pos === st);
    if (pick) doMove(pick);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select|button/i.test(target.tagName)) return;
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (canAct && canThrow(stateRef.current)) doThrow();
      } else if (/^Digit[1-9]$/.test(e.code)) {
        const m = moves[Number(e.code.slice(5)) - 1];
        if (m) doMove(m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canAct, containerRef, doMove, doThrow, moves]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const count = (pl: number, pos: number) => state.pieces[pl].filter((p) => p.pos === pos).length;
  const turnName = names[state.turn];
  const status = finished
    ? ""
    : ai && state.turn === 1
      ? fill(c.thinking, rivalName)
      : state.throwsLeft > 0 && state.pending.length
        ? c.again
        : fill(c.turnOf, turnName);

  const moveLabel = (m: Move) => {
    const p = state.pieces[state.turn][m.piece];
    if (p.pos === HOME) return fill(c.enter, count(state.turn, HOME));
    const n = stackAt(state, state.turn, p.pos).length;
    return n > 1 ? fill(c.moveStack, n) : c.moveOne;
  };

  return (
    <div
      ref={containerRef}
      data-game="yut-nori"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-2" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="group">
          <Button variant={ai ? "default" : "outline"} size="sm" className="min-h-11" onClick={() => reset("ai", level)} aria-pressed={ai}>
            <Bot className="size-4" />
            {c.modeAi}
          </Button>
          <Button variant={!ai ? "default" : "outline"} size="sm" className="min-h-11" onClick={() => reset("duo", level)} aria-pressed={!ai}>
            <Users className="size-4" />
            {c.modeDuo}
          </Button>
        </div>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {ai && <Badge variant="secondary">{fill(c.vs, level + 1, rivalName)}</Badge>}
        {[0, 1].map((pl) => (
          <Badge key={pl} variant={state.turn === pl && !finished ? "default" : "outline"} >
            {pl === 0 ? "🔵" : "🔴"} {names[pl]} · {fill(c.home, count(pl, HOME))} · {fill(c.done, count(pl, DONE))}/{PIECES}
          </Badge>
        ))}
      </div>

      <div className="relative mx-auto w-full">
        <canvas
          ref={canvasRef}
          width={YUT_W}
          height={YUT_H}
          onPointerDown={onCanvas}
          className="aspect-60/71 w-full touch-none select-none rounded-xl border border-border bg-card"
          aria-label={c.intro}
        />
        {finished && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/75 p-4 text-center backdrop-blur-xs">
            <p className="text-2xl font-black">
              {ai ? (state.winner === 0 ? fill(c.won, rivalName) : fill(c.lost, rivalName)) : fill(c.duoWon, names[state.winner ?? 0])}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => reset(mode, level)}>
                <RotateCcw className="size-4" />
                {c.retry}
              </Button>
              {iWon && (
                <Button className="min-h-12" onClick={() => reset("ai", level >= AI_LEVELS - 1 ? 0 : level + 1)}>
                  {level >= AI_LEVELS - 1 ? c.finale : c.next}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="min-h-6 text-sm font-medium" aria-live="polite">{note ?? status}</p>

      {canAct && canThrow(state) && (
        <Button className="min-h-12 w-full" onClick={doThrow}>
          {state.pending.length ? c.again : c.throw}
        </Button>
      )}

      {state.pending.length > 0 && !finished && (
        <div className="space-y-2">
          {state.pending.length > 1 && humanTurn && <p className="text-xs text-muted-foreground">{c.pick}</p>}
          <div className="flex flex-wrap gap-1.5">
            {state.pending.map((t, i) => (
              <Button
                key={`${t}-${i}`}
                size="sm"
                variant={i === selIndex ? "default" : "outline"}
                className="min-h-11"
                disabled={!canAct}
                onClick={() => setSel(i)}
                aria-pressed={i === selIndex}
              >
                {c.throws[t]}
              </Button>
            ))}
          </div>
          {moves.length > 0 && (
            <div className="grid gap-1.5">
              {moves.map((m, i) => (
                <Button key={`${m.throwIndex}-${m.piece}`} variant="secondary" className="min-h-11 justify-start" onClick={() => doMove(m)}>
                  <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                  {moveLabel(m)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">{c.intro}</p>

      {ai && (
        <details className="rounded-lg border border-border p-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
          <div className="pt-2">
            <StageBar count={AI_LEVELS} current={level} cleared={cleared} locale={locale} onSelect={(i) => reset("ai", i)} />
          </div>
        </details>
      )}
    </div>
  );
}
