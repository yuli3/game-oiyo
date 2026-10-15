/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 자리 중 시드가 고른 한 자리만 보여 준다.
 * 읽기와 찍기는 버튼으로 한 번씩 하고, 맞는 흔적이 없으면 그 행동은 일어나지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 화면 왼쪽이 서쪽이고 화면 위가 북쪽이다. 이 자리의 기록은 화면에만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  ACTS,
  FEED,
  STEP_CAP,
  TRACK,
  createHunt,
  nextSeed,
  resign,
  stepHunt,
  type Act,
  type HuntState,
} from "../../lib/games/quiet-hunt";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import QuietHuntScene, { type FieldGlide } from "./QuietHuntScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  read: string;
  shoot: string;
  bare: string;
  track: string;
  feed: string;
  wind: string;
  field: string;
  mark: string;
  miss: string;
  wait: string;
  moveHint: string;
  winHint: string;
  capHint: string;
  pause: string;
  resume: string;
  view: string;
  mute: string;
  sound: string;
  giveUp: string;
  paused: string;
  playing: string;
  stuck: string;
  win: string;
  cap: string;
  resigned: string;
  unread: string;
  readLabel: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "포식자 없는 사냥",
    lead: "읽으면 가장 서쪽의 발자국만 먹이 흔적이 되고 바람은 한 칸 동쪽으로 걷습니다. 찍으면 바람 아래의 먹이만 걷힙니다. 생물을 잡지 않습니다. 남은 먹이와 바람의 자리를 표식에 맞춥니다.",
    keys: "1·R은 읽기, 2·S는 찍기입니다. V는 보기, Esc는 멈추기입니다. 화면 왼쪽이 서쪽이고 번호는 1부터입니다. 보기를 바꿔도 자리는 그대로입니다. 이 자리는 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "행동",
    seed: "시드",
    apply: "이 시드",
    next: "다른 자리",
    acts: "고를 행동",
    read: "읽으면 바람이 동쪽으로 걷는다",
    shoot: "찍으면 바람 아래의 먹이가 걷힌다",
    bare: "빈 칸",
    track: "발자국",
    feed: "먹이",
    wind: "바람",
    field: "자리",
    mark: "표식",
    miss: "이 행동에 맞는 흔적이 없습니다",
    wait: "지금은 조작이 멈춥니다",
    moveHint: "가장 서쪽의 발자국만 바뀌거나, 바람 아래의 먹이만 걷힙니다",
    winHint: "이 행동을 하면 표식과 같아집니다",
    capHint: "이 행동은 여덟 번째이고 표식과 달라집니다",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "할 수 있는 행동",
    stuck: "지금은 할 수 있는 행동이 없습니다.",
    win: "자리와 바람이 표식과 같아졌습니다. 이 자리는 끝났습니다.",
    cap: "여덟 행동 안에 표식과 같아지지 못했습니다.",
    resigned: "이 자리를 포기했습니다.",
    unread: "아직 한 행동도 없습니다.",
    readLabel: "고른 순서",
  },
  en: {
    title: "Quiet Hunt",
    lead: "Reading turns only the westernmost footprint into feed, and the wind walks one plot east. Shooting clears only the feed under the wind. Nothing is caught. Match the feed the mark still keeps, and the place where the wind stops.",
    keys: "1 or R reads, 2 or S shoots. V changes the view, Esc pauses. The left of the screen is west, and plot numbers start at 1. Changing the view leaves the field where it is. This field stays on this screen and is not saved on the device.",
    steps: "Acts",
    seed: "Seed",
    apply: "Use seed",
    next: "Another field",
    acts: "Acts",
    read: "Reading walks the wind east",
    shoot: "Shooting clears the feed under the wind",
    bare: "Bare",
    track: "Track",
    feed: "Feed",
    wind: "Wind",
    field: "Field",
    mark: "Mark",
    miss: "No trace fits this act",
    wait: "The controls are held",
    moveHint: "Only the westernmost footprint changes, or only the feed under the wind clears",
    winHint: "This act matches the mark",
    capHint: "This is the eighth act and the mark still differs",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound on",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Acts you can take",
    stuck: "No act is open right now.",
    win: "The field and the wind match the mark. This place is done.",
    cap: "Eight acts passed before the mark matched.",
    resigned: "You left this field.",
    unread: "No act has been taken yet.",
    readLabel: "Order taken",
  },
  ja: {
    title: "捕食者のいない狩り",
    lead: "読むと最も西の足跡だけが餌跡になり、風は一区画東へ歩きます。撮ると風の下の餌だけが消えます。生き物は捕らえません。残った餌と風の位置を表示に合わせます。",
    keys: "1・Rは読む、2・Sは撮る。Vは視点、Escは一時停止。画面の左が西で、番号は1からです。視点を変えても場所はそのままです。この場所はこの画面だけに残り、端末には保存されません。",
    steps: "手数",
    seed: "シード",
    apply: "このシード",
    next: "別の場所",
    acts: "選ぶ手",
    read: "読むと風が東へ歩く",
    shoot: "撮ると風の下の餌が消える",
    bare: "空き",
    track: "足跡",
    feed: "餌",
    wind: "風",
    field: "場所",
    mark: "表示",
    miss: "この手に合う痕跡がありません",
    wait: "今は操作が止まります",
    moveHint: "最も西の足跡だけが変わるか、風の下の餌だけが消えます",
    winHint: "この手で表示と揃います",
    capHint: "この手は八手目で、表示とまだ違います",
    pause: "一時停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "止まっています。続けると戻ります。",
    playing: "できる手",
    stuck: "今できる手はありません。",
    win: "場所と風が表示と揃いました。この場所は終わりです。",
    cap: "八手のうちに表示と揃いませんでした。",
    resigned: "この場所を離れました。",
    unread: "まだ一手もありません。",
    readLabel: "選んだ順",
  },
  zh: {
    title: "无捕猎的追踪",
    lead: "阅读只把最西边的足迹变成食物痕迹，风往东走一格。拍摄只清掉风下面的食物。不捕捉生物。把留下的食物和风停留的位置对齐标记。",
    keys: "1 或 R 是阅读，2 或 S 是拍摄。V 是视角，Esc 是暂停。画面左侧是西，编号从 1 开始。改变视角不会移动这块地。这块地只留在这个画面上，不会写进设备。",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "另一块地",
    acts: "可选行动",
    read: "阅读则风往东走",
    shoot: "拍摄则清掉风下的食物",
    bare: "空地",
    track: "足迹",
    feed: "食物",
    wind: "风",
    field: "场地",
    mark: "标记",
    miss: "这个行动没有相符的痕迹",
    wait: "现在不能操作",
    moveHint: "只有最西边的足迹会变，或者只有风下面的食物会消失",
    winHint: "这一步之后会和标记一致",
    capHint: "这是第八步，标记仍然不同",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "静音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后回来。",
    playing: "可以做的行动",
    stuck: "现在没有能做的行动。",
    win: "场地和风与标记一致了。这块地结束了。",
    cap: "八步之内没有和标记对齐。",
    resigned: "你离开了这块地。",
    unread: "还没有做过行动。",
    readLabel: "选择顺序",
  },
  fr: {
    title: "Piste sans prise",
    lead: "Lire ne change que l'empreinte la plus à l'ouest en nourriture, et le vent avance d'une parcelle vers l'est. Photographier n'efface que la nourriture sous le vent. Aucun animal n'est pris. On aligne la nourriture que la marque garde encore, et l'endroit où le vent s'arrête.",
    keys: "1 ou R lit, 2 ou S photographie. V change la vue, Échap met en pause. La gauche de l'écran est l'ouest, et les parcelles se comptent à partir de 1. Changer la vue laisse le terrain en place. Ce terrain reste sur cet écran et n'est pas écrit sur l'appareil.",
    steps: "Gestes",
    seed: "Graine",
    apply: "Cette graine",
    next: "Un autre terrain",
    acts: "Gestes à choisir",
    read: "Lire fait marcher le vent vers l'est",
    shoot: "Photographier efface la nourriture sous le vent",
    bare: "Nu",
    track: "Empreinte",
    feed: "Nourriture",
    wind: "Vent",
    field: "Terrain",
    mark: "Marque",
    miss: "Aucune trace ne convient à ce geste",
    wait: "Les commandes sont retenues",
    moveHint: "Seule l'empreinte la plus à l'ouest change, ou seule la nourriture sous le vent s'efface",
    winHint: "Ce geste égale la marque",
    capHint: "C'est le huitième geste et la marque diffère encore",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Silence",
    sound: "Son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Gestes possibles",
    stuck: "Aucun geste n'est ouvert.",
    win: "Le terrain et le vent égalent la marque. Cet endroit est fini.",
    cap: "Huit gestes ont passé avant d'égaler la marque.",
    resigned: "Vous avez quitté ce terrain.",
    unread: "Aucun geste n'a encore été fait.",
    readLabel: "Ordre choisi",
  },
  es: {
    title: "Rastro sin captura",
    lead: "Leer solo vuelve comida la huella más al oeste, y el viento camina una parcela al este. Fotografiar solo quita la comida bajo el viento. No se atrapa a ningún animal. Hay que igualar la comida que la marca aún guarda y el sitio donde el viento se detiene.",
    keys: "1 o R lee, 2 o S fotografía. V cambia la vista, Esc pausa. La izquierda de la pantalla es el oeste, y las parcelas se numeran desde 1. Cambiar la vista deja el terreno donde está. Este terreno se queda en esta pantalla y no se escribe en el aparato.",
    steps: "Gestos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otro terreno",
    acts: "Gestos por elegir",
    read: "Leer hace caminar el viento al este",
    shoot: "Fotografiar quita la comida bajo el viento",
    bare: "Vacío",
    track: "Huella",
    feed: "Comida",
    wind: "Viento",
    field: "Terreno",
    mark: "Marca",
    miss: "Ningún rastro encaja con este gesto",
    wait: "Los mandos están retenidos",
    moveHint: "Solo cambia la huella más al oeste, o solo se quita la comida bajo el viento",
    winHint: "Este gesto iguala la marca",
    capHint: "Este es el octavo gesto y la marca sigue distinta",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Gestos que puedes hacer",
    stuck: "Ahora no hay ningún gesto.",
    win: "El terreno y el viento igualan la marca. Este sitio terminó.",
    cap: "Pasaron ocho gestos antes de igualar la marca.",
    resigned: "Dejaste este terreno.",
    unread: "Todavía no se ha hecho ningún gesto.",
    readLabel: "Orden elegido",
  },
};

type Tick = "read" | "shoot" | "win" | "lose";

interface FieldAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createFieldAudio(): FieldAudio {
  let context: AudioContext | null = null;
  let bed: OscillatorNode | null = null;
  let bedGain: GainNode | null = null;
  let wantBed = false;

  const ensure = () => {
    if (typeof window === "undefined") return null;
    if (context) {
      if (context.state === "suspended") void context.resume();
      return context;
    }
    const scope = window as Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext ?? scope.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    bed = context.createOscillator();
    bed.type = "sine";
    bed.frequency.value = 52;
    bedGain = context.createGain();
    bedGain.gain.value = wantBed ? 0.012 : 0;
    bed.connect(bedGain).connect(context.destination);
    bed.start();
    return context;
  };

  const blip = (ctx: AudioContext, freq: number, duration: number, peak: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(peak, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  };

  return {
    arm() {
      ensure();
    },
    setBed(on) {
      wantBed = on;
      if (!context || !bedGain) return;
      if (context.state === "suspended") void context.resume();
      bedGain.gain.setTargetAtTime(on ? 0.012 : 0, context.currentTime, 0.05);
    },
    tick(kind) {
      if (!wantBed) return;
      const ctx = ensure();
      if (!ctx) return;
      if (kind === "read") {
        blip(ctx, 294, 0.09, 0.02);
        return;
      }
      if (kind === "shoot") {
        blip(ctx, 168, 0.07, 0.028);
        return;
      }
      if (kind === "win") {
        blip(ctx, 330, 0.18, 0.03);
        blip(ctx, 440, 0.26, 0.02);
        return;
      }
      blip(ctx, 70, 0.16, 0.032);
    },
    close() {
      try {
        bed?.stop();
      } catch {
        // The oscillator may already have stopped with the context.
      }
      const closing = context;
      context = null;
      bed = null;
      bedGain = null;
      if (closing && closing.state !== "closed") void closing.close().catch(() => undefined);
    },
  };
}

function readSeed(): number {
  if (typeof window === "undefined") return 0;
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null || raw.trim() === "") return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function writeSeed(value: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(value));
  window.history.replaceState(null, "", url);
}

function controlClass(tone: "primary" | "quiet" | "danger"): string {
  if (tone === "danger") return "min-h-11 min-w-11 rounded-xl bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-40";
  if (tone === "primary") return "min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
}

function actClass(tone: "live" | "quiet" | "danger"): string {
  if (tone === "danger") return "min-h-11 min-w-11 rounded-xl bg-destructive px-3 text-left text-sm font-semibold text-destructive-foreground disabled:opacity-40";
  if (tone === "live") return "min-h-11 min-w-11 rounded-xl bg-primary px-3 text-left text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 min-w-11 rounded-xl bg-muted px-3 text-left text-sm font-semibold text-foreground disabled:opacity-40";
}

function gaugeClass(matched: boolean): string {
  if (matched) return "rounded-xl bg-card px-2 py-2 text-sm text-foreground";
  return "rounded-xl bg-muted px-2 py-2 text-sm text-muted-foreground";
}

function label(act: Act, copy: Copy): string {
  return act === "R" ? copy.read : copy.shoot;
}

function shortcut(act: Act): string {
  return act === "R" ? "Digit1 KeyR" : "Digit2 KeyS";
}

function lawTick(act: Act | null): Tick {
  return act === "S" ? "shoot" : "read";
}

function cellWord(kind: number, copy: Copy): string {
  if (kind === TRACK) return copy.track;
  if (kind === FEED) return copy.feed;
  return copy.bare;
}

function detailFor(state: HuntState, act: Act, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const next = stepHunt(state, act);
  if (next === state) return copy.miss;
  if (next.loseReason === "cap") return copy.capHint;
  if (next.status === "win") return copy.winHint;
  return copy.moveHint;
}

function codeAction(code: string): Act | null {
  if (code === "Digit1" || code === "KeyR") return "R";
  if (code === "Digit2" || code === "KeyS") return "S";
  return null;
}

export default function QuietHunt({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createHunt(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<HuntState>(opening.current);
  const [shown, setShown] = useState<HuntState>(opening.current);
  const [glide, setGlide] = useState<FieldGlide | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState(0);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const mutedRef = useRef(muted);
  const busyRef = useRef(busy);
  const glideSerial = useRef(0);
  const audio = useRef<FieldAudio | null>(null);
  if (!audio.current) audio.current = createFieldAudio();
  stateRef.current = state;
  pausedRef.current = paused;
  mutedRef.current = muted;
  busyRef.current = busy;

  useEffect(() => {
    const player = audio.current;
    return () => {
      player?.close();
    };
  }, []);

  useEffect(() => {
    const fromUrl = readSeed();
    if (fromUrl === 0) return;
    const next = createHunt(fromUrl);
    setSeed(fromUrl);
    setDraft(String(fromUrl));
    setState(next);
    setShown(next);
  }, []);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    audio.current?.setBed(!muted && !paused && !hidden);
  }, [hidden, muted, paused]);

  const arm = useCallback(() => {
    const player = audio.current;
    if (!player) return;
    player.arm();
    player.setBed(!mutedRef.current && !pausedRef.current && !document.hidden);
  }, []);

  const note = useCallback((kind: Tick) => {
    if (mutedRef.current || pausedRef.current) return;
    audio.current?.tick(kind);
  }, []);

  const onSettled = useCallback((id: number) => {
    if (id !== glideSerial.current) return;
    setShown(stateRef.current);
    setGlide(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!busy || !glide || paused || hidden) return;
    const id = glide.id;
    const timer = window.setTimeout(() => {
      if (glideSerial.current !== id) return;
      setShown(stateRef.current);
      setGlide(null);
      setBusy(false);
    }, reduce ? 0 : 420);
    return () => window.clearTimeout(timer);
  }, [busy, glide, hidden, paused, reduce]);

  const begin = useCallback((next: HuntState) => {
    arm();
    if (next.status === "win") {
      note(lawTick(next.lastAction));
      note("win");
    } else if (next.status === "lose") {
      note("lose");
    } else {
      note(lawTick(next.lastAction));
    }
    glideSerial.current += 1;
    setShown(stateRef.current);
    setState(next);
    setGlide({ id: glideSerial.current });
    setBusy(true);
  }, [arm, note]);

  const move = useCallback((act: Act) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepHunt(current, act);
    if (next === current) return;
    begin(next);
  }, [begin]);

  const load = useCallback((value: number) => {
    const next = createHunt(value);
    glideSerial.current += 1;
    setSeed(value);
    setDraft(String(value));
    setState(next);
    setShown(next);
    setGlide(null);
    setBusy(false);
    setPaused(false);
    writeSeed(value);
  }, []);

  const giveUp = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "play") return;
    begin(resign(current));
  }, [begin]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea")) return;
      if (event.code === "Escape") {
        event.preventDefault();
        setPaused((value) => !value);
        return;
      }
      if (event.code === "KeyV") {
        event.preventDefault();
        setView((value) => (value + 1) % 4);
        return;
      }
      const act = codeAction(event.code);
      if (!act) return;
      event.preventDefault();
      move(act);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const locked = paused || busy || state.status !== "play";
  const named = ACTS.filter((act) => {
    const next = stepHunt(state, act);
    return next !== state && next.status !== "lose";
  }).map((act) => label(act, copy));
  const outcome = state.loseReason === "cap" ? copy.cap : copy.resigned;
  const spoken = state.read.length === 0 ? copy.unread : state.read.map((act) => label(act, copy)).join(" · ");
  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : named.length === 0
          ? copy.stuck
          : `${copy.playing} ${named.join(" · ")}`;

  return (
    <div className="space-y-4" onPointerDown={arm}>
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">{copy.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{copy.lead}</p>
        <p className="text-xs leading-5 text-muted-foreground">{copy.keys}</p>
      </header>
      <div className="grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-xl bg-muted p-2">
          <b>{copy.steps}</b>
          <br />
          <span className="tabular-nums">{state.steps}/{STEP_CAP}</span>
        </div>
        <div className="rounded-xl bg-muted p-2">
          <b>{copy.seed}</b>
          <br />
          <span className="tabular-nums">{seed}</span>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{copy.mark}</p>
        <ol aria-label={copy.mark} className="grid grid-cols-5 gap-2 text-center">
          {state.goal.map((kind, index) => (
            <li key={`mark-${index}`} className={gaugeClass(true)}>
              <b className="tabular-nums">{index + 1}</b>
              <span className="block text-xs">{cellWord(kind, copy)}</span>
              {index === state.goalWind ? <span className="block text-xs">{copy.wind}</span> : null}
            </li>
          ))}
        </ol>
        <p className="text-sm font-semibold text-foreground">{copy.field}</p>
        <ol aria-label={copy.field} className="grid grid-cols-5 gap-2 text-center">
          {state.cells.map((kind, index) => (
            <li key={`field-${index}`} className={gaugeClass(kind === state.goal[index] && (index === state.wind) === (index === state.goalWind))}>
              <b className="tabular-nums">{index + 1}</b>
              <span className="block text-xs">{cellWord(kind, copy)}</span>
              {index === state.wind ? <span className="block text-xs">{copy.wind}</span> : null}
            </li>
          ))}
        </ol>
      </div>
      <p className="text-sm text-muted-foreground">
        <b>{copy.readLabel}</b>
        {" "}
        {spoken}
      </p>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-96" aria-hidden="true">
          <QuietHuntScene
            state={state}
            shown={shown}
            glide={glide}
            reduce={reduce}
            paused={paused || hidden}
            view={view}
            onSettled={onSettled}
          />
        </div>
        {paused ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <button type="button" className={controlClass("primary")} onClick={() => setPaused(false)}>
              {copy.resume}
            </button>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <p id="quiet-hunt-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="quiet-hunt-acts" className="grid grid-cols-1 gap-2">
          {ACTS.map((act) => {
            const next = stepHunt(state, act);
            const noop = next === state;
            const doomed = next.loseReason === "cap";
            const tone = locked || noop ? "quiet" : doomed ? "danger" : "live";
            const detail = detailFor(state, act, copy);
            return (
              <button
                key={act}
                type="button"
                className={actClass(tone)}
                aria-keyshortcuts={shortcut(act)}
                aria-label={`${label(act, copy)}. ${detail}`}
                disabled={locked || noop}
                onClick={() => move(act)}
              >
                {label(act, copy)}
                <span className="block text-xs font-normal">{detail}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={paused ? controlClass("primary") : controlClass("quiet")} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
          {paused ? copy.resume : copy.pause}
        </button>
        <button type="button" className={controlClass("quiet")} onClick={() => setView((value) => (value + 1) % 4)}>
          {copy.view}
        </button>
        <button type="button" className={muted ? controlClass("primary") : controlClass("quiet")} aria-pressed={muted} onClick={() => { arm(); setMuted((value) => !value); }}>
          {muted ? copy.sound : copy.mute}
        </button>
        <button type="button" className={controlClass("danger")} disabled={state.status !== "play"} onClick={giveUp}>
          {copy.giveUp}
        </button>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(draft);
          if (!Number.isFinite(value)) return;
          arm();
          load(Math.trunc(value));
        }}
      >
        <label className="space-y-1 text-sm text-foreground">
          <span className="block">{copy.seed}</span>
          <input
            value={draft}
            inputMode="numeric"
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-11 w-28 rounded-xl border border-border bg-card px-3 text-foreground"
          />
        </label>
        <button type="submit" className={controlClass("quiet")}>{copy.apply}</button>
        <button
          type="button"
          className={controlClass("quiet")}
          onClick={() => {
            arm();
            load(nextSeed(seed));
          }}
        >
          {copy.next}
        </button>
      </form>
    </div>
  );
}
