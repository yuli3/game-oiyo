/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 마을 중 시드가 고른 한 마을만 보여 준다.
 * 기쁘게 하기와 비를 부르기는 버튼으로 한 번씩 하고, 맞는 칸이 없으면 그 행동은 일어나지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 화면 왼쪽이 서쪽이고 화면 위가 북쪽이다. 이 마을의 기록은 화면에만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  ACTS,
  DRY,
  STEP_CAP,
  WET,
  createTown,
  nextSeed,
  resign,
  stepTown,
  type Act,
  type TownState,
} from "../../lib/games/emotion-weather";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import EmotionWeatherScene, { type TownGlide } from "./EmotionWeatherScene";
import { useCardTiltPro, MobileHapticsPro } from "../../lib/games/engine-suite-unified";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  cheer: string;
  rain: string;
  dry: string;
  fair: string;
  wet: string;
  town: string;
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
    title: "감정 기상청",
    lead: "기쁘게 하면 가장 서쪽의 비만 걷히고 바로 동쪽은 한 단계 마른다. 비를 부르면 가장 서쪽의 가뭄만 풀리고 바로 동쪽은 한 단계 젖는다. 모두를 기쁘게 하는 것이 아니라, 표식의 가뭄과 비를 남기는 순서를 고른다.",
    keys: "1·C는 기쁘게 하기, 2·R은 비를 부르기입니다. V는 보기, Esc는 멈춤입니다. 화면 왼쪽이 서쪽이고 칸 번호는 1부터입니다. 보기를 바꿔도 마을은 그대로입니다. 이 마을은 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "행동",
    seed: "시드",
    apply: "이 시드",
    next: "다른 마을",
    acts: "고를 행동",
    cheer: "기쁘게 하면 동쪽이 마른다",
    rain: "비를 부르면 동쪽이 젖는다",
    dry: "가뭄",
    fair: "맑음",
    wet: "비",
    town: "마을",
    mark: "표식",
    miss: "이 행동에 맞는 칸이 없습니다",
    wait: "지금은 조작이 멈춥니다",
    moveHint: "가장 서쪽의 맞는 칸만 바뀌고 바로 동쪽이 넘칩니다",
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
    win: "마을이 표식과 같아졌습니다. 이 마을이 끝났습니다.",
    cap: "여덟 행동 안에 표식과 같아지지 못했습니다.",
    resigned: "이 마을을 포기했습니다.",
    unread: "아직 한 행동도 없습니다.",
    readLabel: "고른 순서",
  },
  en: {
    title: "Emotion Weather",
    lead: "Cheering clears only the westernmost rain, and the district just east dries one step. Calling rain lifts only the westernmost drought, and the district just east gets one step wetter. The aim is not to cheer everyone. Choose the order that leaves the mark's drought and rain.",
    keys: "1 or C cheers, 2 or R calls rain. V changes the view, Esc pauses. The left of the screen is west, and district numbers start at 1. Changing the view leaves the town where it is. This town stays on this screen and is not saved on the device.",
    steps: "Acts",
    seed: "Seed",
    apply: "Use seed",
    next: "Another town",
    acts: "Acts",
    cheer: "Cheering dries the east",
    rain: "Rain wets the east",
    dry: "Drought",
    fair: "Mild",
    wet: "Rain",
    town: "Town",
    mark: "Mark",
    miss: "No district fits this act",
    wait: "The controls are held",
    moveHint: "Only the westernmost fitting district changes, and the east takes the spill",
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
    win: "The town matches the mark. This town is over.",
    cap: "Eight acts passed before the town matched the mark.",
    resigned: "You left this town.",
    unread: "No act has been taken yet.",
    readLabel: "Order taken",
  },
  ja: {
    title: "感情気象台",
    lead: "喜ばせると、最も西の雨だけがやみ、すぐ東は一段階乾きます。雨を呼ぶと、最も西の日照りだけが解け、すぐ東は一段階濡れます。全員を喜ばせることが目的ではありません。標識に残る日照りと雨に揃う順序を選びます。",
    keys: "1・Cは喜ばせる、2・Rは雨を呼ぶ。Vは視点、Escは一時停止。画面の左が西で、番号は1からです。視点を変えても町はそのままです。この町はこの画面だけに残り、端末には保存されません。",
    steps: "手",
    seed: "シード",
    apply: "このシード",
    next: "別の町",
    acts: "選ぶ手",
    cheer: "喜ばせると東が乾く",
    rain: "雨を呼ぶと東が濡れる",
    dry: "日照り",
    fair: "穏やか",
    wet: "雨",
    town: "町",
    mark: "標識",
    miss: "この手に当てはまる区がありません",
    wait: "いまは操作が止まります",
    moveHint: "最も西の当てはまる区だけが変わり、すぐ東があふれます",
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
    win: "町が標識と揃いました。この町は終わりです。",
    cap: "八つの手で標識と揃えられませんでした。",
    resigned: "この町をあきらめました。",
    unread: "まだ手はありません。",
    readLabel: "選んだ順",
  },
  zh: {
    title: "情绪气象台",
    lead: "让人高兴，只会放晴最西边的雨，紧挨着的东边会干一档。呼唤雨水，只会解除最西边的干旱，紧挨着的东边会湿一档。目的不是让所有人都高兴。选择顺序，留下标记上的干旱和雨。",
    keys: "1 或 C 是让人高兴，2 或 R 是呼唤雨水。V 换视角，Esc 暂停。画面左侧是西，格子从 1 开始数。换视角不会改动村子。这个村子只留在这个画面上，不会写进设备。",
    steps: "步",
    seed: "种子",
    apply: "使用种子",
    next: "另一座",
    acts: "要选的行动",
    cheer: "让人高兴则东边变干",
    rain: "呼唤雨水则东边变湿",
    dry: "干旱",
    fair: "和煦",
    wet: "雨",
    town: "村子",
    mark: "标记",
    miss: "这个行动没有相符的格子",
    wait: "现在不能操作",
    moveHint: "只有最西边相符的格子会变，紧东边承接溢出",
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
    win: "村子和标记一致了。这座村子结束了。",
    cap: "八步之内没有和标记对齐。",
    resigned: "你离开了这座村子。",
    unread: "还没有做过行动。",
    readLabel: "选择顺序",
  },
  fr: {
    title: "Météo des humeurs",
    lead: "Réjouir ne dissipe que la pluie la plus à l'ouest, et le quartier juste à l'est s'assèche d'un cran. Appeler la pluie ne lève que la sécheresse la plus à l'ouest, et le quartier juste à l'est se mouille d'un cran. Le but n'est pas de réjouir tout le monde. On choisit l'ordre qui laisse la sécheresse et la pluie de la marque.",
    keys: "1 ou C réjouit, 2 ou R appelle la pluie. V change la vue, Échap met en pause. La gauche de l'écran est l'ouest, et les quartiers se comptent à partir de 1. Changer la vue laisse le village en place. Ce village reste sur cet écran et n'est pas écrit sur l'appareil.",
    steps: "Gestes",
    seed: "Graine",
    apply: "Cette graine",
    next: "Un autre village",
    acts: "Gestes à choisir",
    cheer: "Réjouir assèche l'est",
    rain: "La pluie mouille l'est",
    dry: "Sécheresse",
    fair: "Douceur",
    wet: "Pluie",
    town: "Village",
    mark: "Marque",
    miss: "Aucun quartier ne convient à ce geste",
    wait: "Les commandes sont tenues",
    moveHint: "Seul le quartier convenable le plus à l'ouest change, et l'est reçoit le trop-plein",
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
    win: "Le village égale la marque. Ce village est fini.",
    cap: "Huit gestes ont passé avant que le village égale la marque.",
    resigned: "Vous avez quitté ce village.",
    unread: "Aucun geste n'a encore été choisi.",
    readLabel: "Ordre choisi",
  },
  es: {
    title: "Tiempo de los ánimos",
    lead: "Alegrar solo despeja la lluvia más al oeste, y el barrio justo al este se seca un grado. Llamar la lluvia solo levanta la sequía más al oeste, y el barrio justo al este se moja un grado. La meta no es alegrar a todos. Eliges el orden que deja la sequía y la lluvia de la marca.",
    keys: "1 o C alegra, 2 o R llama la lluvia. V cambia la vista, Esc pausa. La izquierda de la pantalla es el oeste, y los barrios se numeran desde 1. Cambiar la vista deja el pueblo donde está. Este pueblo se queda en esta pantalla y no se guarda en el aparato.",
    steps: "Gestos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otro pueblo",
    acts: "Gestos por elegir",
    cheer: "Alegrar seca el este",
    rain: "La lluvia moja el este",
    dry: "Sequía",
    fair: "Bonanza",
    wet: "Lluvia",
    town: "Pueblo",
    mark: "Marca",
    miss: "Ningún barrio encaja con este gesto",
    wait: "Los mandos están retenidos",
    moveHint: "Solo cambia el barrio que encaja más al oeste, y el este recibe el exceso",
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
    win: "El pueblo iguala la marca. Este pueblo terminó.",
    cap: "Pasaron ocho gestos antes de igualar la marca.",
    resigned: "Dejaste este pueblo.",
    unread: "Todavía no se ha hecho ningún gesto.",
    readLabel: "Orden elegido",
  },
};

type Tick = "cheer" | "rain" | "win" | "lose";

interface TownAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createTownAudio(): TownAudio {
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
      if (kind === "cheer") {
        blip(ctx, 330, 0.08, 0.024);
        return;
      }
      if (kind === "rain") {
        blip(ctx, 220, 0.1, 0.022);
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

function TiltActButton({
  tone,
  shortcutKey,
  label,
  detail,
  disabled,
  onClick,
}: {
  tone: "live" | "quiet" | "danger";
  shortcutKey: string;
  label: string;
  detail: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const { transformCss, onPointerMove, onPointerLeave, triggerPop } = useCardTiltPro();

  return (
    <button
      type="button"
      style={
        {
          '--card-tilt': transformCss,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`${actClass(tone)} transition will-change-transform transform-(--card-tilt)`}
      aria-keyshortcuts={shortcutKey}
      aria-label={`${label}. ${detail}`}
      disabled={disabled}
      onClick={() => {
        triggerPop(0.12);
        onClick();
      }}
    >
      {label}
      <span className="block text-xs font-normal">{detail}</span>
    </button>
  );
}

function gaugeClass(matched: boolean): string {
  if (matched) return "rounded-xl bg-card px-2 py-2 text-sm text-foreground";
  return "rounded-xl bg-muted px-2 py-2 text-sm text-muted-foreground";
}

function label(act: Act, copy: Copy): string {
  return act === "C" ? copy.cheer : copy.rain;
}

function shortcut(act: Act): string {
  return act === "C" ? "Digit1 KeyC" : "Digit2 KeyR";
}

function lawTick(act: Act | null): Tick {
  return act === "R" ? "rain" : "cheer";
}

function cellWord(kind: number, copy: Copy): string {
  if (kind === DRY) return copy.dry;
  if (kind === WET) return copy.wet;
  return copy.fair;
}

function detailFor(state: TownState, act: Act, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const next = stepTown(state, act);
  if (next === state) return copy.miss;
  if (next.loseReason === "cap") return copy.capHint;
  if (next.status === "win") return copy.winHint;
  return copy.moveHint;
}

function codeAction(code: string): Act | null {
  if (code === "Digit1" || code === "KeyC") return "C";
  if (code === "Digit2" || code === "KeyR") return "R";
  return null;
}

export default function EmotionWeather({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createTown(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<TownState>(opening.current);
  const [shown, setShown] = useState<TownState>(opening.current);
  const [glide, setGlide] = useState<TownGlide | null>(null);
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
  const audio = useRef<TownAudio | null>(null);
  if (!audio.current) audio.current = createTownAudio();
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
    const next = createTown(fromUrl);
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

  const begin = useCallback((next: TownState) => {
    arm();
    if (next.status === "win") {
      note(lawTick(next.lastAction));
      note("win");
      MobileHapticsPro.success();
    } else if (next.status === "lose") {
      note("lose");
      MobileHapticsPro.warning();
    } else {
      note(lawTick(next.lastAction));
      MobileHapticsPro.light();
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
    const next = stepTown(current, act);
    if (next === current) return;
    begin(next);
  }, [begin]);

  const load = useCallback((value: number) => {
    const next = createTown(value);
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
    const next = stepTown(state, act);
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
        <p className="text-sm font-semibold text-foreground">{copy.town}</p>
        <ol aria-label={copy.town} className="grid grid-cols-5 gap-2 text-center">
          {state.cells.map((kind, index) => (
            <li key={`town-${index}`} className={gaugeClass(kind === state.goal[index])}>
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
          <EmotionWeatherScene
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
        <p id="emotion-weather-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="emotion-weather-acts" className="grid grid-cols-1 gap-2">
          {ACTS.map((act) => {
            const next = stepTown(state, act);
            const noop = next === state;
            const doomed = next.loseReason === "cap";
            const tone = locked || noop ? "quiet" : doomed ? "danger" : "live";
            const detail = detailFor(state, act, copy);
            return (
              <TiltActButton
                key={act}
                tone={tone}
                shortcutKey={shortcut(act)}
                label={label(act, copy)}
                detail={detail}
                disabled={locked || noop}
                onClick={() => move(act)}
              />
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
