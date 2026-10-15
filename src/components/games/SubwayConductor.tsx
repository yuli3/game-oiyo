/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 시각표 중 시드가 고른 한 노선만 보여 준다.
 * 붙잡기와 보내기는 버튼으로 한 번씩 하고, 맞는 승강장이 없으면 그 행동은 일어나지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 화면 왼쪽이 서쪽이고 화면 위가 북쪽이다. 이 노선의 기록은 화면에만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  ACTS,
  DUE,
  LATE,
  STEP_CAP,
  createLine,
  nextSeed,
  resign,
  stepLine,
  type Act,
  type LineState,
} from "../../lib/games/subway-conductor";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import SubwayConductorScene, { type LineGlide } from "./SubwayConductorScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  hold: string;
  send: string;
  quiet: string;
  due: string;
  late: string;
  line: string;
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
    title: "지하철 지휘자",
    lead: "붙잡으면 가장 서쪽의 지연만 한 박자 줄고, 바로 동쪽은 한 단계 한산해진다. 보내면 가장 서쪽의 정시만 떠나고, 바로 동쪽은 한 단계 밀린다. 모두 비우는 것이 아니라, 표식에 남은 한산과 지연을 맞춘다.",
    keys: "1·H는 붙잡기, 2·S는 보내기입니다. V는 보기, Esc는 멈춤입니다. 화면 왼쪽이 서쪽이고 칸 번호는 1부터입니다. 보기를 바꿔도 노선은 그대로입니다. 이 노선은 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "행동",
    seed: "시드",
    apply: "이 시드",
    next: "다른 노선",
    acts: "고를 행동",
    hold: "붙잡으면 동쪽이 한산해진다",
    send: "보내면 동쪽이 밀린다",
    quiet: "한산",
    due: "정시",
    late: "지연",
    line: "노선",
    mark: "표식",
    miss: "이 행동에 맞는 승강장이 없습니다",
    wait: "지금은 조작이 멈춥니다",
    moveHint: "가장 서쪽의 맞는 승강장만 바뀌고 바로 동쪽이 이어받습니다",
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
    win: "노선이 표식과 같아졌습니다. 이 시각표가 끝났습니다.",
    cap: "여덟 행동 안에 표식과 같아지지 못했습니다.",
    resigned: "이 노선을 포기했습니다.",
    unread: "아직 한 행동도 없습니다.",
    readLabel: "고른 순서",
  },
  en: {
    title: "Subway Conductor",
    lead: "Holding eases only the westernmost late train, and the platform just east gets one step quieter. Sending clears only the westernmost due train, and the platform just east takes one step of the bunch. The aim is not to empty the line. Match the quiet platforms and the late train the mark still keeps.",
    keys: "1 or H holds, 2 or S sends. V changes the view, Esc pauses. The left of the screen is west, and platform numbers start at 1. Changing the view leaves the line where it is. This line stays on this screen and is not saved on the device.",
    steps: "Acts",
    seed: "Seed",
    apply: "Use seed",
    next: "Another line",
    acts: "Acts",
    hold: "Holding eases the east",
    send: "Sending crowds the east",
    quiet: "Quiet",
    due: "Due",
    late: "Late",
    line: "Line",
    mark: "Mark",
    miss: "No platform fits this act",
    wait: "The controls are held",
    moveHint: "Only the westernmost fitting platform changes, and the east takes the cascade",
    winHint: "This act matches the mark",
    capHint: "This is the eighth act and the mark still differs",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Acts you can take",
    stuck: "No act can be taken.",
    win: "The line matches the mark. This timetable is over.",
    cap: "Eight acts passed before the line matched the mark.",
    resigned: "You left this line.",
    unread: "No act has been taken yet.",
    readLabel: "Order taken",
  },
  ja: {
    title: "地下鉄の指揮者",
    lead: "引き止めると、最も西の遅延だけが一拍ゆるみ、すぐ東は一段階空きます。送り出すと、最も西の定時だけが発ち、すぐ東は一段階混みます。全部空けることが目的ではありません。標識に残る空きと遅延に揃えます。",
    keys: "1・Hは引き止める、2・Sは送り出す。Vは視点、Escは一時停止。画面の左が西で、番号は1からです。視点を変えても路線はそのままです。この路線はこの画面だけに残り、端末には保存されません。",
    steps: "手",
    seed: "シード",
    apply: "このシード",
    next: "別の路線",
    acts: "選ぶ手",
    hold: "引き止めると東が空く",
    send: "送り出すと東が混む",
    quiet: "空き",
    due: "定時",
    late: "遅延",
    line: "路線",
    mark: "標識",
    miss: "この手に当てはまるホームがありません",
    wait: "いまは操作が止まります",
    moveHint: "最も西の当てはまるホームだけが変わり、すぐ東が受け継ぎます",
    winHint: "この手で標識と揃います",
    capHint: "この手は八つ目で、標識とはまだ違います",
    pause: "一時停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "止まっています。続けると戻ります。",
    playing: "打てる手",
    stuck: "いま打てる手はありません。",
    win: "路線が標識と揃いました。この時刻表は終わりです。",
    cap: "八つの手で標識と揃えられませんでした。",
    resigned: "この路線をあきらめました。",
    unread: "まだ手はありません。",
    readLabel: "選んだ順",
  },
  zh: {
    title: "地铁调度员",
    lead: "挽留只会让最西边的晚点松一拍，紧挨着的东边会空一档。发出只会让最西边的准点列车离开，紧挨着的东边会挤一档。目的不是把整条线清空。对齐标记上留下的空闲和晚点。",
    keys: "1 或 H 是挽留，2 或 S 是发出。V 换视角，Esc 暂停。画面左侧是西，站台从 1 开始数。换视角不会改动线路。这条线路只留在这个画面上，不会写进设备。",
    steps: "步",
    seed: "种子",
    apply: "使用种子",
    next: "另一条",
    acts: "要选的行动",
    hold: "挽留则东边变空",
    send: "发出则东边变挤",
    quiet: "空闲",
    due: "准点",
    late: "晚点",
    line: "线路",
    mark: "标记",
    miss: "这个行动没有相符的站台",
    wait: "现在不能操作",
    moveHint: "只有最西边相符的站台会变，紧东边承接连锁",
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
    win: "线路和标记一致了。这张时刻表结束了。",
    cap: "八步之内没有和标记对齐。",
    resigned: "你离开了这条线路。",
    unread: "还没有做过行动。",
    readLabel: "选择顺序",
  },
  fr: {
    title: "Chef de rame",
    lead: "Retenir ne relâche que le retard le plus à l'ouest, et le quai juste à l'est se vide d'un cran. Envoyer ne fait partir que la rame à l'heure la plus à l'ouest, et le quai juste à l'est se charge d'un cran. Le but n'est pas de vider toute la ligne. On aligne les quais calmes et le retard que la marque garde.",
    keys: "1 ou H retient, 2 ou S envoie. V change la vue, Échap met en pause. La gauche de l'écran est l'ouest, et les quais se comptent à partir de 1. Changer la vue laisse la ligne en place. Cette ligne reste sur cet écran et n'est pas écrite sur l'appareil.",
    steps: "Gestes",
    seed: "Graine",
    apply: "Cette graine",
    next: "Une autre ligne",
    acts: "Gestes à choisir",
    hold: "Retenir vide l'est",
    send: "Envoyer charge l'est",
    quiet: "Calme",
    due: "À l'heure",
    late: "Retard",
    line: "Ligne",
    mark: "Marque",
    miss: "Aucun quai ne convient à ce geste",
    wait: "Les commandes sont tenues",
    moveHint: "Seul le quai convenable le plus à l'ouest change, et l'est reçoit la suite",
    winHint: "Ce geste égale la marque",
    capHint: "C'est le huitième geste et la marque diffère encore",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Gestes possibles",
    stuck: "Aucun geste n'est possible.",
    win: "La ligne égale la marque. Cet horaire est fini.",
    cap: "Huit gestes ont passé avant que la ligne égale la marque.",
    resigned: "Vous avez quitté cette ligne.",
    unread: "Aucun geste n'a encore été choisi.",
    readLabel: "Ordre choisi",
  },
  es: {
    title: "Jefe de andén",
    lead: "Retener solo afloja el retraso más al oeste, y el andén justo al este se vacía un grado. Enviar solo hace salir el tren en hora más al oeste, y el andén justo al este se carga un grado. La meta no es vaciar toda la línea. Igualas los andenes quietos y el retraso que la marca conserva.",
    keys: "1 o H retiene, 2 o S envía. V cambia la vista, Esc pausa. La izquierda de la pantalla es el oeste, y los andenes se numeran desde 1. Cambiar la vista deja la línea donde está. Esta línea se queda en esta pantalla y no se guarda en el aparato.",
    steps: "Gestos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otra línea",
    acts: "Gestos por elegir",
    hold: "Retener vacía el este",
    send: "Enviar carga el este",
    quiet: "Quieto",
    due: "En hora",
    late: "Retraso",
    line: "Línea",
    mark: "Marca",
    miss: "Ningún andén encaja con este gesto",
    wait: "Los mandos están retenidos",
    moveHint: "Solo cambia el andén que encaja más al oeste, y el este recibe la cadena",
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
    win: "La línea iguala la marca. Este horario terminó.",
    cap: "Pasaron ocho gestos antes de igualar la marca.",
    resigned: "Dejaste esta línea.",
    unread: "Todavía no se ha hecho ningún gesto.",
    readLabel: "Orden elegido",
  },
};

type Tick = "hold" | "send" | "win" | "lose";

interface LineAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createLineAudio(): LineAudio {
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
      if (kind === "hold") {
        blip(ctx, 280, 0.09, 0.022);
        return;
      }
      if (kind === "send") {
        blip(ctx, 196, 0.08, 0.024);
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
  return act === "H" ? copy.hold : copy.send;
}

function shortcut(act: Act): string {
  return act === "H" ? "Digit1 KeyH" : "Digit2 KeyS";
}

function lawTick(act: Act | null): Tick {
  return act === "S" ? "send" : "hold";
}

function cellWord(kind: number, copy: Copy): string {
  if (kind === LATE) return copy.late;
  if (kind === DUE) return copy.due;
  return copy.quiet;
}

function detailFor(state: LineState, act: Act, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const next = stepLine(state, act);
  if (next === state) return copy.miss;
  if (next.loseReason === "cap") return copy.capHint;
  if (next.status === "win") return copy.winHint;
  return copy.moveHint;
}

function codeAction(code: string): Act | null {
  if (code === "Digit1" || code === "KeyH") return "H";
  if (code === "Digit2" || code === "KeyS") return "S";
  return null;
}

export default function SubwayConductor({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createLine(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<LineState>(opening.current);
  const [shown, setShown] = useState<LineState>(opening.current);
  const [glide, setGlide] = useState<LineGlide | null>(null);
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
  const audio = useRef<LineAudio | null>(null);
  if (!audio.current) audio.current = createLineAudio();
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
    const next = createLine(fromUrl);
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

  const begin = useCallback((next: LineState) => {
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
    const next = stepLine(current, act);
    if (next === current) return;
    begin(next);
  }, [begin]);

  const load = useCallback((value: number) => {
    const next = createLine(value);
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
    const next = stepLine(state, act);
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
            </li>
          ))}
        </ol>
        <p className="text-sm font-semibold text-foreground">{copy.line}</p>
        <ol aria-label={copy.line} className="grid grid-cols-5 gap-2 text-center">
          {state.cells.map((kind, index) => (
            <li key={`line-${index}`} className={gaugeClass(kind === state.goal[index])}>
              <b className="tabular-nums">{index + 1}</b>
              <span className="block text-xs">{cellWord(kind, copy)}</span>
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
          <SubwayConductorScene
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
        <p id="subway-conductor-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="subway-conductor-acts" className="grid grid-cols-1 gap-2">
          {ACTS.map((act) => {
            const next = stepLine(state, act);
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
