/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 방 중 시드가 고른 한 방만 보여 준다.
 * 문장은 버튼으로 한 번씩 읽고, 맞는 짝이 없으면 그 문장은 읽히지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 화면 왼쪽이 서쪽이고 화면 위가 북쪽이다. 이 방의 기록은 화면에만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  ACTS,
  FIRE,
  ICE,
  STEP_CAP,
  WATER,
  createRoom,
  nextSeed,
  resign,
  stepRoom,
  type Act,
  type RoomState,
} from "../../lib/games/sentence-dungeon";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import SentenceDungeonScene, { type RoomGlide } from "./SentenceDungeonScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  melt: string;
  quench: string;
  dry: string;
  empty: string;
  ice: string;
  fire: string;
  water: string;
  room: string;
  mark: string;
  miss: string;
  wait: string;
  readHint: string;
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
    title: "문장 던전",
    lead: "한 문장은 가장 서쪽의 맞는 짝에만 한 번 읽힙니다. 불 바로 동쪽의 얼음은 물이 되고, 물 바로 동쪽의 불은 꺼지며, 불 바로 동쪽의 물은 마릅니다. 복도가 표식과 같아질 때까지 문장 순서를 고릅니다.",
    keys: "1·M은 녹이기, 2·Q는 끄기, 3·D는 말리기입니다. V는 보기, Esc는 멈춤입니다. 화면 왼쪽이 서쪽이고 칸 번호는 1부터입니다. 보기를 바꿔도 복도는 그대로입니다. 이 방은 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "문장",
    seed: "시드",
    apply: "이 시드",
    next: "다른 방",
    acts: "읽을 문장",
    melt: "불은 동쪽 얼음을 녹인다",
    quench: "물은 동쪽 불을 끈다",
    dry: "불은 동쪽 물을 말린다",
    empty: "빈칸",
    ice: "얼음",
    fire: "불",
    water: "물",
    room: "복도",
    mark: "표식",
    miss: "이 문장에 맞는 짝이 없습니다",
    wait: "지금은 조작이 멈춥니다",
    readHint: "가장 서쪽의 맞는 짝만 바뀝니다",
    winHint: "이 문장을 읽으면 표식과 같아집니다",
    capHint: "이 문장은 여덟 번째이고 표식과 달라집니다",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "읽을 수 있는 문장",
    stuck: "지금은 읽을 문장이 없습니다.",
    win: "복도가 표식과 같아졌습니다. 이 방이 끝났습니다.",
    cap: "여덟 문장 안에 표식과 같아지지 못했습니다.",
    resigned: "이 방을 포기했습니다.",
    unread: "아직 읽은 문장이 없습니다.",
    readLabel: "읽은 순서",
  },
  en: {
    title: "Sentence Dungeon",
    lead: "One sentence is read once, and only on the westernmost pair it fits. Ice just east of a fire becomes water, a fire just east of water goes out, and water just east of a fire dries. Choose the order until the corridor matches the mark.",
    keys: "1 or M melts, 2 or Q puts a fire out, 3 or D dries. V changes the view, Esc pauses. The left of the screen is west, and alcove numbers start at 1. Changing the view leaves the corridor where it is. This room stays on this screen and is not saved on the device.",
    steps: "Sentences",
    seed: "Seed",
    apply: "Use seed",
    next: "Another room",
    acts: "Sentences",
    melt: "Fire melts the ice to its east",
    quench: "Water puts out the fire to its east",
    dry: "Fire dries the water to its east",
    empty: "Empty",
    ice: "Ice",
    fire: "Fire",
    water: "Water",
    room: "Corridor",
    mark: "Mark",
    miss: "No pair fits this sentence",
    wait: "The controls are held",
    readHint: "Only the westernmost fitting pair changes",
    winHint: "Reading this sentence matches the mark",
    capHint: "This is the eighth sentence and the mark still differs",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Sentences you can read",
    stuck: "No sentence can be read.",
    win: "The corridor matches the mark. This room is over.",
    cap: "Eight sentences passed before the corridor matched the mark.",
    resigned: "You left this room.",
    unread: "No sentence has been read yet.",
    readLabel: "Order read",
  },
  ja: {
    title: "文の迷宮",
    lead: "一つの文は、当てはまる最も西の組に一度だけ読まれます。火のすぐ東の氷は水になり、水のすぐ東の火は消え、火のすぐ東の水は乾きます。廊下が表示と揃うまで、文の順序を選びます。",
    keys: "1・Mは溶かす、2・Qは消す、3・Dは乾かす。Vは視点、Escは一時停止。画面の左が西で、番号は1からです。視点を変えても廊下はそのままです。この部屋はこの画面だけに残り、端末には保存されません。",
    steps: "文",
    seed: "シード",
    apply: "このシード",
    next: "別の部屋",
    acts: "読む文",
    melt: "火は東の氷を溶かす",
    quench: "水は東の火を消す",
    dry: "火は東の水を乾かす",
    empty: "空",
    ice: "氷",
    fire: "火",
    water: "水",
    room: "廊下",
    mark: "標識",
    miss: "この文に当てはまる組がありません",
    wait: "いまは操作が止まります",
    readHint: "最も西の当てはまる組だけが変わります",
    winHint: "この文を読むと標識と揃います",
    capHint: "この文は八つ目で、標識とはまだ違います",
    pause: "一時停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "止まっています。続けると戻ります。",
    playing: "読める文",
    stuck: "いま読める文はありません。",
    win: "廊下が標識と揃いました。この部屋は終わりです。",
    cap: "八つの文で標識と揃えられませんでした。",
    resigned: "この部屋をあきらめました。",
    unread: "まだ読んだ文はありません。",
    readLabel: "読んだ順",
  },
  zh: {
    title: "句子地牢",
    lead: "一句话只读一次，而且只作用在最西边那对相符的格子上。火正东边的冰变成水，水正东边的火熄灭，火正东边的水变干。选择句子的顺序，直到走廊和标记一致。",
    keys: "1 或 M 是融化，2 或 Q 是熄灭，3 或 D 是烤干。V 换视角，Esc 暂停。画面左侧是西，格子从 1 开始数。换视角不会改动走廊。这个房间只留在这个画面上，不会写进设备。",
    steps: "句",
    seed: "种子",
    apply: "使用种子",
    next: "另一间",
    acts: "要读的句子",
    melt: "火融化东边的冰",
    quench: "水熄灭东边的火",
    dry: "火烤干东边的水",
    empty: "空",
    ice: "冰",
    fire: "火",
    water: "水",
    room: "走廊",
    mark: "标记",
    miss: "这句话没有相符的一对",
    wait: "现在不能操作",
    readHint: "只有最西边相符的那一对会变",
    winHint: "读出这句话后会和标记一致",
    capHint: "这是第八句，标记仍然不同",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "静音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后回来。",
    playing: "可以读的句子",
    stuck: "现在没有能读的句子。",
    win: "走廊和标记一致了。这个房间结束了。",
    cap: "八句话之内没有和标记对齐。",
    resigned: "你离开了这个房间。",
    unread: "还没有读过句子。",
    readLabel: "朗读顺序",
  },
  fr: {
    title: "Donjon des phrases",
    lead: "Une phrase ne se lit qu'une fois, et seulement sur la paire la plus à l'ouest qu'elle concerne. La glace juste à l'est d'un feu devient de l'eau, le feu juste à l'est de l'eau s'éteint, et l'eau juste à l'est d'un feu sèche. On choisit l'ordre jusqu'à ce que le couloir égale la marque.",
    keys: "1 ou M fait fondre, 2 ou Q éteint, 3 ou D sèche. V change la vue, Échap met en pause. La gauche de l'écran est l'ouest, et les alcôves se comptent à partir de 1. Changer la vue laisse le couloir en place. Cette salle reste sur cet écran et n'est pas écrite sur l'appareil.",
    steps: "Phrases",
    seed: "Graine",
    apply: "Cette graine",
    next: "Une autre salle",
    acts: "Phrases à lire",
    melt: "Le feu fond la glace à l'est",
    quench: "L'eau éteint le feu à l'est",
    dry: "Le feu sèche l'eau à l'est",
    empty: "Vide",
    ice: "Glace",
    fire: "Feu",
    water: "Eau",
    room: "Couloir",
    mark: "Marque",
    miss: "Aucune paire ne convient à cette phrase",
    wait: "Les commandes sont tenues",
    readHint: "Seule la paire convenable la plus à l'ouest change",
    winHint: "Lire cette phrase égale la marque",
    capHint: "C'est la huitième phrase et la marque diffère encore",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Phrases lisibles",
    stuck: "Aucune phrase ne peut être lue.",
    win: "Le couloir égale la marque. Cette salle est finie.",
    cap: "Huit phrases ont passé avant que le couloir égale la marque.",
    resigned: "Vous avez quitté cette salle.",
    unread: "Aucune phrase n'a encore été lue.",
    readLabel: "Ordre lu",
  },
  es: {
    title: "Mazmorra de frases",
    lead: "Una frase se lee una sola vez, y solo en el par más al oeste que le corresponde. El hielo justo al este de un fuego se vuelve agua, el fuego justo al este del agua se apaga, y el agua justo al este de un fuego se seca. Eliges el orden hasta que el pasillo iguala la marca.",
    keys: "1 o M derrite, 2 o Q apaga, 3 o D seca. V cambia la vista, Esc pausa. La izquierda de la pantalla es el oeste, y los huecos se numeran desde 1. Cambiar la vista deja el pasillo donde está. Esta sala se queda en esta pantalla y no se guarda en el aparato.",
    steps: "Frases",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otra sala",
    acts: "Frases por leer",
    melt: "El fuego funde el hielo del este",
    quench: "El agua apaga el fuego del este",
    dry: "El fuego seca el agua del este",
    empty: "Vacío",
    ice: "Hielo",
    fire: "Fuego",
    water: "Agua",
    room: "Pasillo",
    mark: "Marca",
    miss: "Ningún par encaja con esta frase",
    wait: "Los mandos están retenidos",
    readHint: "Solo cambia el par que encaja más al oeste",
    winHint: "Leer esta frase iguala la marca",
    capHint: "Esta es la octava frase y la marca sigue distinta",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Frases que puedes leer",
    stuck: "Ahora no hay ninguna frase que leer.",
    win: "El pasillo iguala la marca. Esta sala terminó.",
    cap: "Pasaron ocho frases antes de igualar la marca.",
    resigned: "Dejaste esta sala.",
    unread: "Todavía no se ha leído ninguna frase.",
    readLabel: "Orden leído",
  },
};

type Tick = "melt" | "quench" | "dry" | "win" | "lose";

interface RoomAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createRoomAudio(): RoomAudio {
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
      if (kind === "melt") {
        blip(ctx, 392, 0.08, 0.024);
        return;
      }
      if (kind === "quench") {
        blip(ctx, 180, 0.1, 0.022);
        return;
      }
      if (kind === "dry") {
        blip(ctx, 260, 0.08, 0.02);
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
  if (act === "M") return copy.melt;
  if (act === "Q") return copy.quench;
  return copy.dry;
}

function shortcut(act: Act): string {
  if (act === "M") return "Digit1 KeyM";
  if (act === "Q") return "Digit2 KeyQ";
  return "Digit3 KeyD";
}

function lawTick(act: Act | null): Tick {
  if (act === "Q") return "quench";
  if (act === "D") return "dry";
  return "melt";
}

function cellWord(kind: number, copy: Copy): string {
  if (kind === ICE) return copy.ice;
  if (kind === FIRE) return copy.fire;
  if (kind === WATER) return copy.water;
  return copy.empty;
}

function detailFor(state: RoomState, act: Act, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const next = stepRoom(state, act);
  if (next === state) return copy.miss;
  if (next.loseReason === "cap") return copy.capHint;
  if (next.status === "win") return copy.winHint;
  return copy.readHint;
}

function codeAction(code: string): Act | null {
  if (code === "Digit1" || code === "KeyM") return "M";
  if (code === "Digit2" || code === "KeyQ") return "Q";
  if (code === "Digit3" || code === "KeyD") return "D";
  return null;
}

export default function SentenceDungeon({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createRoom(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<RoomState>(opening.current);
  const [shown, setShown] = useState<RoomState>(opening.current);
  const [glide, setGlide] = useState<RoomGlide | null>(null);
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
  const audio = useRef<RoomAudio | null>(null);
  if (!audio.current) audio.current = createRoomAudio();
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
    const next = createRoom(fromUrl);
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

  const begin = useCallback((next: RoomState) => {
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
    const next = stepRoom(current, act);
    if (next === current) return;
    begin(next);
  }, [begin]);

  const load = useCallback((value: number) => {
    const next = createRoom(value);
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
    const next = stepRoom(state, act);
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
        <p className="text-sm font-semibold text-foreground">{copy.room}</p>
        <ol aria-label={copy.room} className="grid grid-cols-5 gap-2 text-center">
          {state.cells.map((kind, index) => (
            <li key={`room-${index}`} className={gaugeClass(kind === state.goal[index])}>
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
          <SentenceDungeonScene
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
        <p id="sentence-dungeon-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="sentence-dungeon-acts" className="grid grid-cols-1 gap-2">
          {ACTS.map((act) => {
            const next = stepRoom(state, act);
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
