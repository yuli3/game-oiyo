/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 밤 중 시드가 고른 한 전시실만 보여 준다.
 * 카메라와 관람 시선은 숨기지 않는다. 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 동쪽은 화면 오른쪽이다. 이 밤의 기록은 화면에만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Check } from "lucide-react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import type { Locale } from "../../lib/i18n";
import {
  ACTS,
  STEP_CAP,
  beatVisitors,
  createNight,
  nextSeed,
  playerAt,
  resign,
  stepNight,
  type Act,
  type NightState,
} from "../../lib/games/museum-night";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import MuseumNightScene, { type NightGlide } from "./MuseumNightScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  west: string;
  stay: string;
  east: string;
  beat: string;
  cameraName: string;
  visitorName: string;
  you: string;
  markName: string;
  none: string;
  limit: string;
  wait: string;
  seenHint: string;
  stayHint: string;
  swapHint: string;
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
  seen: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "박물관의 밤",
    lead: "당신은 전시품입니다. 서 있는 좌대나 들어가려는 좌대가 보이면 그 걸음은 들킵니다. 그대로 서 있으면 안전하고, 시선만 한 박자 돌아갑니다. 양쪽이 모두 어두울 때만 옆 전시품과 자리를 바꾸고, 야간 표식에 서면 그 밤이 끝납니다.",
    keys: "왼쪽·A는 서쪽, 오른쪽·D는 동쪽, 아래·S는 그대로 서 있기입니다. V는 보기, Esc는 멈춤입니다. 동쪽은 화면 오른쪽이고, 보기를 바꿔도 전시품은 그대로입니다. 빨간 카메라는 이번 밤 내내 한 좌대만 보고, 관람 시선은 박자마다 바뀝니다. 이 밤은 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "걸음",
    seed: "시드",
    apply: "이 시드",
    next: "다른 밤",
    acts: "걸음",
    west: "서쪽",
    stay: "서 있기",
    east: "동쪽",
    beat: "박자",
    cameraName: "카메라",
    visitorName: "관람",
    you: "나",
    markName: "표식",
    none: "없음",
    limit: "그 방향에는 좌대가 없습니다",
    wait: "지금은 조작이 멈춥니다",
    seenHint: "그 좌대는 지금 보입니다. 움직이면 들킵니다",
    stayHint: "그 자리에 서면 시선만 한 박자 돌아갑니다",
    swapHint: "옆 전시품과 자리를 바꿉니다",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "갈 수 있는 걸음",
    stuck: "지금은 움직일 수 없습니다.",
    win: "야간 표식에 섰습니다. 이 밤이 끝났습니다.",
    cap: "여덟 걸음 안에 표식에 서지 못했습니다.",
    resigned: "이 밤을 포기했습니다.",
    seen: "그 걸음이 시선에 들켰습니다.",
  },
  en: {
    title: "Museum Night",
    lead: "You are an exhibit. A step is seen when the plinth you stand on or the plinth you enter is watched. Standing still is safe and only turns the gaze one beat. You trade places with the next exhibit only when both plinths are dark, and the night ends when you stand on the mark.",
    keys: "Left or A is west, right or D is east, down or S is standing still. V changes the view, Esc pauses. East is the right of the screen, and changing the view leaves the exhibits where they are. The red camera watches one plinth all night, and the visitor cones change with the beat. This night stays on this screen and is not saved on the device.",
    steps: "Steps",
    seed: "Seed",
    apply: "Use seed",
    next: "Another night",
    acts: "Step",
    west: "West",
    stay: "Stay",
    east: "East",
    beat: "Beat",
    cameraName: "Camera",
    visitorName: "Visitors",
    you: "You",
    markName: "Mark",
    none: "None",
    limit: "There is no plinth that way",
    wait: "The controls are held",
    seenHint: "That plinth is watched. Moving is seen",
    stayHint: "Standing there turns only the gaze one beat",
    swapHint: "Trade places with the next exhibit",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Open steps",
    stuck: "Nothing can move.",
    win: "You stand on the night mark. This night is over.",
    cap: "Eight steps passed without reaching the mark.",
    resigned: "You left this night.",
    seen: "That step was seen.",
  },
  ja: {
    title: "博物館の夜",
    lead: "あなたは展示品です。今の台座か、入ろうとする台座が見えているとその一歩は気づかれます。その場に立てば安全で、視線だけが一拍進みます。両方の台座が暗いときだけ隣の展示品と席を替え、夜間の標識に立つとその夜が終わります。",
    keys: "左・Aは西、右・Dは東、下・Sはその場に立つことです。Vは視点、Escは一時停止。東は画面の右で、視点を変えても展示品はそのままです。赤いカメラは今夜ずっと一つの台座を見て、観覧の視線は拍ごとに変わります。この夜はこの画面だけに残り、端末には保存されません。",
    steps: "歩数",
    seed: "シード",
    apply: "このシード",
    next: "別の夜",
    acts: "一歩",
    west: "西",
    stay: "立つ",
    east: "東",
    beat: "拍",
    cameraName: "カメラ",
    visitorName: "観覧",
    you: "自分",
    markName: "標識",
    none: "なし",
    limit: "その方向に台座はありません",
    wait: "いまは操作が止まります",
    seenHint: "その台座は今見えています。動くと気づかれます",
    stayHint: "その場に立つと視線だけが一拍進みます",
    swapHint: "隣の展示品と席を替えます",
    pause: "一時停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "止まっています。続けると戻ります。",
    playing: "できる一歩",
    stuck: "いまは動けません。",
    win: "夜間の標識に立ちました。この夜は終わりです。",
    cap: "八歩のうちに標識へ立てませんでした。",
    resigned: "この夜をあきらめました。",
    seen: "その一歩は視線に気づかれました。",
  },
  zh: {
    title: "博物馆之夜",
    lead: "你是一件展品。你站着的台座或正要进入的台座被看见时，这一步会被发现。站着不动是安全的，只让视线转一拍。两个台座都暗着时，才能和旁边的展品换位置。站上夜间标记，这个夜晚就结束。",
    keys: "左或 A 是西，右或 D 是东，下或 S 是站着不动。V 换视角，Esc 暂停。东是画面右侧，换视角不会移动展品。红色摄像机整晚只看一个台座，观众的视线随节拍改变。这个夜晚只留在这个画面上，不会写进设备。",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "另一个夜晚",
    acts: "一步",
    west: "西",
    stay: "站着",
    east: "东",
    beat: "节拍",
    cameraName: "摄像机",
    visitorName: "观众",
    you: "我",
    markName: "标记",
    none: "无",
    limit: "那个方向没有台座",
    wait: "现在不能操作",
    seenHint: "那个台座正被看着。移动会被发现",
    stayHint: "站在那里只让视线转一拍",
    swapHint: "和旁边的展品换位置",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "静音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后回来。",
    playing: "可以走的一步",
    stuck: "现在不能动。",
    win: "你站上了夜间标记。这个夜晚结束了。",
    cap: "八步之内没有站上标记。",
    resigned: "你离开了这个夜晚。",
    seen: "这一步被视线发现了。",
  },
  fr: {
    title: "Nuit au musée",
    lead: "Vous êtes une pièce. Un pas est vu quand le socle où vous êtes, ou celui où vous entrez, est regardé. Rester debout est sûr et ne fait tourner que le regard d'un temps. Vous échangez avec la pièce voisine seulement si les deux socles sont dans le noir, et la nuit se termine sur la marque.",
    keys: "Gauche ou A est l'ouest, droite ou D l'est, bas ou S rester debout. V change la vue, Échap met en pause. L'est est à droite de l'écran, et changer la vue laisse les pièces en place. La caméra rouge regarde un seul socle toute la nuit, et les regards des visiteurs changent à chaque temps. Cette nuit reste sur cet écran et n'est pas écrite sur l'appareil.",
    steps: "Pas",
    seed: "Graine",
    apply: "Cette graine",
    next: "Une autre nuit",
    acts: "Pas",
    west: "Ouest",
    stay: "Rester",
    east: "Est",
    beat: "Temps",
    cameraName: "Caméra",
    visitorName: "Visiteurs",
    you: "Vous",
    markName: "Marque",
    none: "Aucun",
    limit: "Il n'y a pas de socle de ce côté",
    wait: "Les commandes sont tenues",
    seenHint: "Ce socle est regardé. Bouger est vu",
    stayHint: "Rester là ne fait tourner que le regard d'un temps",
    swapHint: "Échanger avec la pièce voisine",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Pas ouverts",
    stuck: "Rien ne peut bouger.",
    win: "Vous êtes sur la marque de nuit. Cette nuit est finie.",
    cap: "Huit pas ont passé sans atteindre la marque.",
    resigned: "Vous avez quitté cette nuit.",
    seen: "Ce pas a été vu.",
  },
  es: {
    title: "Noche en el museo",
    lead: "Eres una pieza. Un paso se ve cuando el pedestal donde estás, o el pedestal al que entras, está mirado. Quedarte quieto es seguro y solo gira la mirada un tiempo. Cambias de sitio con la pieza de al lado solo cuando los dos pedestales están a oscuras, y la noche termina al pisar la marca.",
    keys: "Izquierda o A es el oeste, derecha o D el este, abajo o S quedarte quieto. V cambia la vista, Esc pausa. El este queda a la derecha de la pantalla, y cambiar la vista deja las piezas donde están. La cámara roja mira un solo pedestal toda la noche, y las miradas de los visitantes cambian con el tiempo. Esta noche se queda en esta pantalla y no se guarda en el aparato.",
    steps: "Pasos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otra noche",
    acts: "Paso",
    west: "Oeste",
    stay: "Quieto",
    east: "Este",
    beat: "Tiempo",
    cameraName: "Cámara",
    visitorName: "Visitantes",
    you: "Tú",
    markName: "Marca",
    none: "Ninguno",
    limit: "No hay pedestal hacia allá",
    wait: "Los mandos están retenidos",
    seenHint: "Ese pedestal está mirado. Moverse se ve",
    stayHint: "Quedarte ahí solo gira la mirada un tiempo",
    swapHint: "Cambiar de sitio con la pieza de al lado",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Pasos abiertos",
    stuck: "Ahora no se mueve nada.",
    win: "Estás sobre la marca de la noche. Esta noche terminó.",
    cap: "Pasaron ocho pasos sin llegar a la marca.",
    resigned: "Dejaste esta noche.",
    seen: "Ese paso fue visto.",
  },
};

type Tick = "swap" | "stay" | "seen" | "win" | "lose";

interface HallAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createHallAudio(): HallAudio {
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
      if (kind === "swap") {
        blip(ctx, 180, 0.08, 0.026);
        return;
      }
      if (kind === "stay") {
        blip(ctx, 140, 0.07, 0.018);
        return;
      }
      if (kind === "seen") {
        blip(ctx, 90, 0.05, 0.02);
        return;
      }
      if (kind === "win") {
        blip(ctx, 349, 0.18, 0.03);
        blip(ctx, 440, 0.26, 0.02);
        return;
      }
      blip(ctx, 78, 0.16, 0.034);
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
  if (tone === "danger") return "min-h-11 min-w-11 rounded-xl bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-40";
  if (tone === "live") return "min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
}

function gaugeClass(ready: boolean): string {
  if (ready) return "rounded-xl bg-card px-3 py-2 text-sm text-foreground";
  return "rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground";
}

function label(act: Act, copy: Copy): string {
  if (act === "W") return copy.west;
  if (act === "E") return copy.east;
  return copy.stay;
}

function shortcut(act: Act): string {
  if (act === "W") return "ArrowLeft A";
  if (act === "E") return "ArrowRight D";
  return "ArrowDown S";
}

function nums(cells: readonly number[], empty: string): string {
  if (cells.length === 0) return empty;
  return cells.map((cell) => String(cell + 1)).join(" · ");
}

function detailFor(state: NightState, act: Act, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const next = stepNight(state, act);
  if (next === state) return copy.limit;
  if (next.loseReason === "seen") return copy.seenHint;
  if (act === "H") return copy.stayHint;
  return copy.swapHint;
}

function codeAction(code: string): Act | null {
  if (code === "ArrowLeft" || code === "KeyA") return "W";
  if (code === "ArrowRight" || code === "KeyD") return "E";
  if (code === "ArrowDown" || code === "KeyS") return "H";
  return null;
}

const PAD: readonly Act[] = ["W", "H", "E"];

export default function MuseumNight({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createNight(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<NightState>(opening.current);
  const [shown, setShown] = useState<NightState>(opening.current);
  const [glide, setGlide] = useState<NightGlide | null>(null);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState(0);
  const [shareCardCopied, setShareCardCopied] = useState(false);
  const stateRef = useRef(state);
  const pausedRef = useRef(paused);
  const mutedRef = useRef(muted);
  const busyRef = useRef(busy);
  const glideSerial = useRef(0);
  const audio = useRef<HallAudio | null>(null);
  if (!audio.current) audio.current = createHallAudio();
  stateRef.current = state;
  pausedRef.current = paused;
  mutedRef.current = muted;
  busyRef.current = busy;

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "3D Museum Night",
      subtitle: state.status === "win" ? "심야 순찰 목표 달성" : "박물관의 밤 탐사 기록",
      score: state.status === "win" ? `${state.steps}스텝 탈출` : `${state.steps}스텝 진행`,
      slug: "museum-night",
      customStats: [
        { label: "SEED", value: `#${seed}` },
        { label: "STEPS", value: `${state.steps}/${STEP_CAP}` },
        { label: "STATUS", value: state.status === "win" ? "성공 (WIN)" : state.status === "lose" ? "발각/정지" : "순찰 중" },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `museum-night-${seed}.png`);
    }
  }, [seed, state.status, state.steps]);

  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (state.status !== prevStatusRef.current && containerRef.current) {
      if (state.status === "win") {
        celebrate(containerRef.current, { preset: "sparks" });
      }
    }
    prevStatusRef.current = state.status;
  }, [state.status, containerRef]);

  useEffect(() => {
    const player = audio.current;
    return () => {
      player?.close();
    };
  }, []);

  useEffect(() => {
    const fromUrl = readSeed();
    if (fromUrl === 0) return;
    const next = createNight(fromUrl);
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

  const begin = useCallback((next: NightState, kind: Tick) => {
    arm();
    note(kind);
    glideSerial.current += 1;
    setShown(stateRef.current);
    setState(next);
    setGlide({ id: glideSerial.current });
    setBusy(true);
  }, [arm, note]);

  const move = useCallback((act: Act) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepNight(current, act);
    if (next === current) return;
    const kind: Tick = next.status === "win"
      ? "win"
      : next.loseReason === "seen"
        ? "seen"
        : next.status === "lose"
          ? "lose"
          : act === "H"
            ? "stay"
            : "swap";
    begin(next, kind);
  }, [begin]);

  const load = useCallback((value: number) => {
    const next = createNight(value);
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
    begin(resign(current), "lose");
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
  const safeNames = ACTS.filter((act) => {
    const next = stepNight(state, act);
    return next !== state && next.status === "play";
  }).map((act) => label(act, copy));
  const onMark = playerAt(state.seats) === state.goal;
  const outcome = state.loseReason === "seen"
    ? copy.seen
    : state.loseReason === "cap"
      ? copy.cap
      : copy.resigned;
  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : safeNames.length === 0
          ? copy.stuck
          : `${copy.playing} ${safeNames.join(" · ")}`;

  return (
    <div
      ref={containerRef}
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-4 overflow-y-auto overscroll-none bg-background" : "space-y-4"}
      onPointerDown={arm}
    >
      <header className="relative shrink-0 space-y-2 pr-12">
        <button
          type="button"
          onClick={togglePortal}
          className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition hover:bg-muted"
          title={isImmersive ? portalLabels.exit : portalLabels.enter}
          aria-label={isImmersive ? portalLabels.exit : portalLabels.enter}
        >
          {isImmersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
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
      <ol className="grid gap-2">
        <li className={gaugeClass(onMark)}>
          {copy.you} {playerAt(state.seats) + 1} · {copy.markName} {state.goal + 1}
        </li>
        <li className={gaugeClass(false)}>
          {copy.beat} {state.phase + 1}/{state.visitors.length} · {copy.cameraName} {nums(state.camera, copy.none)} · {copy.visitorName} {nums(beatVisitors(state), copy.none)}
        </li>
      </ol>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      {state.status !== "play" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-foreground">
              {state.status === "win" ? "✨ 심야 순찰 목표 달성!" : "🚨 순찰 종료"}
            </p>
            <p className="text-xs text-muted-foreground">
              {state.status === "win" ? `${state.steps}스텝 만에 시선과 카메라를 피해 목표 표식에 도달했습니다.` : outcome}
            </p>
          </div>
          <button
            type="button"
            onClick={handleShareCard}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-bold text-secondary-foreground shadow-sm transition hover:bg-muted"
          >
            {shareCardCopied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
            <span>{shareCardCopied ? "복사 완료!" : "결과 카드 공유"}</span>
          </button>
        </div>
      )}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-96" aria-hidden="true">
          <MuseumNightScene
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
        <p id="museum-night-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="museum-night-acts" className="grid grid-cols-3 gap-2">
          {PAD.map((act) => {
            const next = stepNight(state, act);
            const noop = next === state;
            const seen = next.loseReason === "seen";
            const tone = locked || noop ? "quiet" : seen ? "danger" : "live";
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
