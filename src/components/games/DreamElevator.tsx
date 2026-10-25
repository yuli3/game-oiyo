/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 층계 중 시드가 고른 한 판만 보여 준다.
 * 같은 시드는 같은 꿈이다. 자동으로 타 주지 않는다. 보기 버튼은 층과 물건을 바꾸지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
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
  FLOOR_COUNT,
  STEP_CAP,
  createDream,
  nextSeed,
  openActs,
  resign,
  stepDream,
  type Act,
  type DreamState,
  type Relic,
} from "../../lib/games/dream-elevator";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import DreamElevatorScene, { type DreamGlide } from "./DreamElevatorScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  up: string;
  down: string;
  swap: string;
  bare: string;
  sealed: string;
  top: string;
  bottom: string;
  nothing: string;
  downHint: string;
  exchange: string;
  take: string;
  place: string;
  holding: string;
  lobby: string;
  seal: string;
  dream: string;
  slot: string;
  empty: string;
  unwritten: string;
  stone: string;
  mote: string;
  hour: string;
  gravity: string;
  shrink: string;
  still: string;
  pause: string;
  resume: string;
  view: string;
  mute: string;
  sound: string;
  giveUp: string;
  paused: string;
  playing: string;
  none: string;
  win: string;
  cap: string;
  resigned: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "꿈의 엘리베이터",
    lead: "손에 든 물건이 다음 층의 꿈을 씁니다. 그 꿈이 봉인과 같을 때만 더 올라갑니다.",
    keys: "위·아래는 층의 방향입니다. 보기를 돌려도 버튼은 그대로입니다. E는 손과 칸의 물건을 바꿉니다. V는 보기, Esc는 멈춤.",
    steps: "걸음",
    seed: "시드",
    apply: "이 시드",
    next: "다른 꿈",
    acts: "칸",
    up: "올라가기",
    down: "내려가기",
    swap: "바꾸기",
    bare: "빈손이라 문이 열리지 않습니다",
    sealed: "이 층의 꿈이 봉인과 달라 더 못 올라갑니다",
    top: "꼭대기입니다",
    bottom: "로비입니다",
    nothing: "바꿀 물건이 없습니다",
    downHint: "내려가도 꿈은 그대로입니다",
    exchange: "칸의 물건과 바꿉니다",
    take: "집어 듭니다",
    place: "칸에 내려놓습니다",
    holding: "손",
    lobby: "로비",
    seal: "봉인",
    dream: "꿈",
    slot: "칸",
    empty: "비어 있음",
    unwritten: "아직 없음",
    stone: "돌",
    mote: "티끌",
    hour: "시계",
    gravity: "중력",
    shrink: "작아짐",
    still: "멈춤",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "갈 수 있는 칸",
    none: "지금은 갈 곳이 없습니다.",
    win: "꼭대기 층의 꿈이 봉인과 맞았습니다.",
    cap: "열두 걸음 안에 꼭대기의 봉인을 맞추지 못했습니다.",
    resigned: "이 꿈을 포기했습니다.",
  },
  en: {
    title: "Dream Elevator",
    lead: "The object in your hand writes the next floor's dream. You climb on only when that dream matches the floor's seal.",
    keys: "Up and down are floors, not the camera. Turning the view leaves the buttons as they are. E swaps your hand with the landing. V changes the view, Esc pauses.",
    steps: "Steps",
    seed: "Seed",
    apply: "Use seed",
    next: "Another dream",
    acts: "Moves",
    up: "Ride up",
    down: "Ride down",
    swap: "Swap",
    bare: "Empty hands do not open the door",
    sealed: "This dream does not match the seal, so the cabin stays",
    top: "Already at the top",
    bottom: "Already in the lobby",
    nothing: "Nothing to swap",
    downHint: "Riding down leaves the dream as it is",
    exchange: "Swap with the landing",
    take: "Pick up",
    place: "Set down",
    holding: "Hand",
    lobby: "Lobby",
    seal: "Seal",
    dream: "Dream",
    slot: "Landing",
    empty: "Empty",
    unwritten: "Not yet written",
    stone: "Stone",
    mote: "Mote",
    hour: "Clock",
    gravity: "Gravity",
    shrink: "Shrinking",
    still: "Stillness",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Open moves",
    none: "No move is open.",
    win: "The top floor's dream matches its seal.",
    cap: "Twelve steps passed without the top seal.",
    resigned: "You left this dream.",
  },
  ja: {
    title: "夢のエレベーター",
    lead: "手に持った物が次の階の夢を書きます。その夢が封印と一致したときだけ、さらに上がれます。",
    keys: "上下は階の方向です。視点を回してもボタンはそのままです。Eで手と階の物を交換します。Vは視点、Escは停止。",
    steps: "歩数",
    seed: "シード",
    apply: "このシード",
    next: "別の夢",
    acts: "操作",
    up: "上へ",
    down: "下へ",
    swap: "入れ替え",
    bare: "素手では扉が開きません",
    sealed: "この階の夢が封印と違うので、さらに上がれません",
    top: "最上階です",
    bottom: "ロビーです",
    nothing: "入れ替える物がありません",
    downHint: "下へ降りても夢はそのままです",
    exchange: "階の物と入れ替えます",
    take: "拾います",
    place: "階に置きます",
    holding: "手",
    lobby: "ロビー",
    seal: "封印",
    dream: "夢",
    slot: "階",
    empty: "空",
    unwritten: "まだない",
    stone: "石",
    mote: "塵",
    hour: "時計",
    gravity: "重力",
    shrink: "縮小",
    still: "停止",
    pause: "一時停止",
    resume: "再開",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "停止中です。再開で戻ります。",
    playing: "使える操作",
    none: "今は移動できません。",
    win: "最上階の夢が封印と一致しました。",
    cap: "12歩までに最上階の封印を合わせられませんでした。",
    resigned: "この夢をあきらめました。",
  },
  zh: {
    title: "梦之电梯",
    lead: "手里的东西写下下一层的梦。只有这场梦和封印一致时，才能再往上。",
    keys: "上下是楼层方向。转动视角不会改变按钮。E 交换手里和这层的东西。V 是视角，Esc 是暂停。",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "另一场梦",
    acts: "操作",
    up: "上行",
    down: "下行",
    swap: "交换",
    bare: "空手打不开门",
    sealed: "这一层的梦和封印不同，不能再往上",
    top: "已经在顶层",
    bottom: "已经在门厅",
    nothing: "没有可交换的东西",
    downHint: "下去不会改写这场梦",
    exchange: "和这一层的东西交换",
    take: "拿起",
    place: "放下",
    holding: "手",
    lobby: "门厅",
    seal: "封印",
    dream: "梦",
    slot: "这层",
    empty: "空",
    unwritten: "还没写",
    stone: "石",
    mote: "尘",
    hour: "钟",
    gravity: "重力",
    shrink: "缩小",
    still: "静止",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "关闭声音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后返回。",
    playing: "可以做的操作",
    none: "现在没有可走的步。",
    win: "顶层的梦和封印一致了。",
    cap: "十二步内没有对上顶层封印。",
    resigned: "你离开了这场梦。",
  },
  fr: {
    title: "Ascenseur des rêves",
    lead: "L'objet tenu en main inscrit le rêve de l'étage d'au-dessus. On ne monte que lorsque ce rêve est le sceau de l'étage.",
    keys: "Haut et bas sont les étages, pas la caméra. Tourner la vue laisse les boutons en place. E échange la main et le palier. V change la vue, Échap met en pause.",
    steps: "Pas",
    seed: "Graine",
    apply: "Cette graine",
    next: "Un autre rêve",
    acts: "Gestes",
    up: "Monter",
    down: "Descendre",
    swap: "Échanger",
    bare: "Les mains vides n'ouvrent pas la porte",
    sealed: "Ce rêve n'est pas le sceau, la cabine reste",
    top: "Déjà tout en haut",
    bottom: "Déjà dans le hall",
    nothing: "Rien à échanger",
    downHint: "Descendre laisse le rêve tel quel",
    exchange: "Échanger avec le palier",
    take: "Ramasser",
    place: "Poser",
    holding: "Main",
    lobby: "Hall",
    seal: "Sceau",
    dream: "Rêve",
    slot: "Palier",
    empty: "Vide",
    unwritten: "Pas encore écrit",
    stone: "Pierre",
    mote: "Grain",
    hour: "Horloge",
    gravity: "Gravité",
    shrink: "Rétrécissement",
    still: "Immobilité",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Gestes ouverts",
    none: "Aucun geste n'est ouvert.",
    win: "Le rêve du dernier étage est son sceau.",
    cap: "Douze pas ont passé sans le sceau du sommet.",
    resigned: "Ce rêve a été quitté.",
  },
  es: {
    title: "Ascensor de los sueños",
    lead: "Lo que llevas en la mano escribe el sueño del piso de arriba. Subes solo cuando ese sueño es el sello del piso.",
    keys: "Arriba y abajo son pisos, no la cámara. Girar la vista deja los botones quietos. E cambia lo de la mano con el rellano. V cambia la vista, Esc pausa.",
    steps: "Pasos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otro sueño",
    acts: "Movimientos",
    up: "Subir",
    down: "Bajar",
    swap: "Cambiar",
    bare: "Con las manos vacías la puerta no se abre",
    sealed: "Este sueño no es el sello, así que la cabina se queda",
    top: "Ya estás arriba del todo",
    bottom: "Ya estás en el vestíbulo",
    nothing: "No hay nada que cambiar",
    downHint: "Bajar deja el sueño como está",
    exchange: "Cambiar con el rellano",
    take: "Recoger",
    place: "Dejar",
    holding: "Mano",
    lobby: "Vestíbulo",
    seal: "Sello",
    dream: "Sueño",
    slot: "Rellano",
    empty: "Vacío",
    unwritten: "Aún sin escribir",
    stone: "Piedra",
    mote: "Mota",
    hour: "Reloj",
    gravity: "Gravedad",
    shrink: "Encogimiento",
    still: "Quietud",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Movimientos abiertos",
    none: "Ahora no hay ningún movimiento.",
    win: "El sueño del último piso coincide con su sello.",
    cap: "Pasaron doce pasos sin el sello de la cima.",
    resigned: "Dejaste este sueño.",
  },
};

type Tick = "open" | "rewrite" | "down" | "swap" | "block" | "win" | "lose";

interface DreamAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createDreamAudio(): DreamAudio {
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

  const blip = (ctx: AudioContext, freq: number, duration: number, peak: number, type: OscillatorType) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
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
      const ctx = ensure();
      if (!ctx || !wantBed) return;
      if (kind === "open") {
        blip(ctx, 220, 0.1, 0.03, "sine");
        blip(ctx, 330, 0.14, 0.02, "triangle");
        return;
      }
      if (kind === "rewrite") {
        blip(ctx, 196, 0.1, 0.03, "sine");
        blip(ctx, 294, 0.16, 0.02, "triangle");
        return;
      }
      if (kind === "down") {
        blip(ctx, 146, 0.1, 0.03, "sine");
        return;
      }
      if (kind === "swap") {
        blip(ctx, 330, 0.08, 0.028, "triangle");
        return;
      }
      if (kind === "win") {
        blip(ctx, 392, 0.2, 0.03, "sine");
        blip(ctx, 588, 0.28, 0.02, "sine");
        return;
      }
      blip(ctx, kind === "lose" ? 82 : 98, kind === "lose" ? 0.16 : 0.07, kind === "lose" ? 0.04 : 0.02, "sine");
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

function floorClass(current: boolean): string {
  if (current) return "rounded-xl bg-muted px-3 py-2 text-sm text-foreground";
  return "rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground";
}

function relicName(relic: Relic | null, copy: Copy): string {
  if (relic === "stone") return copy.stone;
  if (relic === "mote") return copy.mote;
  if (relic === "hour") return copy.hour;
  return copy.empty;
}

function lawName(relic: Relic, copy: Copy): string {
  if (relic === "stone") return copy.gravity;
  if (relic === "mote") return copy.shrink;
  return copy.still;
}

function upDetail(state: DreamState, copy: Copy): string {
  if (state.floor >= FLOOR_COUNT - 1) return copy.top;
  if (state.floor > 0 && state.laws[state.floor] !== state.seals[state.floor]) return copy.sealed;
  if (!state.hand) return copy.bare;
  return `${relicName(state.hand, copy)}. ${lawName(state.hand, copy)}`;
}

function swapDetail(state: DreamState, copy: Copy): string {
  const slot = state.slots[state.floor] ?? null;
  if (!state.hand && !slot) return copy.nothing;
  if (state.hand && slot) return `${copy.exchange} ${relicName(slot, copy)}`;
  if (slot) return `${copy.take} ${relicName(slot, copy)}`;
  return `${copy.place} ${relicName(state.hand, copy)}`;
}

function floorLine(index: number, state: DreamState, copy: Copy): string {
  const slot = relicName(state.slots[index] ?? null, copy);
  if (index === 0) return `${copy.lobby} · ${copy.slot} ${slot}`;
  const seal = state.seals[index];
  const law = state.laws[index];
  const dream = law ? `${relicName(law, copy)} · ${lawName(law, copy)}` : copy.unwritten;
  const sealName = seal === "lobby" ? copy.lobby : relicName(seal, copy);
  return `${copy.seal} ${sealName} · ${copy.dream} ${dream} · ${copy.slot} ${slot}`;
}

function codeAct(code: string): Act | null {
  if (code === "ArrowUp" || code === "KeyW") return "up";
  if (code === "ArrowDown" || code === "KeyS") return "down";
  if (code === "KeyE") return "swap";
  return null;
}

export default function DreamElevator({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createDream(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<DreamState>(opening.current);
  const [shown, setShown] = useState<DreamState>(opening.current);
  const [glide, setGlide] = useState<DreamGlide | null>(null);
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
  const audio = useRef<DreamAudio | null>(null);
  if (!audio.current) audio.current = createDreamAudio();
  stateRef.current = state;
  pausedRef.current = paused;
  mutedRef.current = muted;
  busyRef.current = busy;

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "3D Dream Elevator",
      subtitle: state.status === "win" ? "최상층 꿈 도달" : "꿈의 엘리베이터 기록",
      score: state.status === "win" ? `${state.floor}F 완료 (${state.steps}걸음)` : `${state.floor}F 도달`,
      slug: "dream-elevator",
      customStats: [
        { label: "FLOOR", value: `${state.floor}층` },
        { label: "STEPS", value: `${state.steps}/${STEP_CAP}` },
        { label: "SEED", value: `#${seed}` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `dream-elevator-${seed}.png`);
    }
  }, [seed, state.floor, state.status, state.steps]);

  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (state.status !== prevStatusRef.current && containerRef.current) {
      if (state.status === "win") {
        celebrate(containerRef.current, { preset: "shards" });
      }
    }
    prevStatusRef.current = state.status;
  }, [state.status, containerRef]);

  useEffect(() => {
    const player = audio.current;
    return () => player?.close();
  }, []);

  useEffect(() => {
    const fromUrl = readSeed();
    if (fromUrl === 0) return;
    const next = createDream(fromUrl);
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

  const note = useCallback((kind: "open" | "rewrite" | "down" | "swap", next: DreamState) => {
    const player = audio.current;
    if (!player || mutedRef.current || pausedRef.current) return;
    player.tick(kind);
    if (next.status === "win") player.tick("win");
    if (next.status === "lose") player.tick("lose");
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
    // The mesh reports the end of the ride. This only unlocks if that report never arrives.
    const timer = window.setTimeout(() => {
      if (glideSerial.current !== id) return;
      setShown(stateRef.current);
      setGlide(null);
      setBusy(false);
    }, reduce ? 0 : 900);
    return () => window.clearTimeout(timer);
  }, [busy, glide, hidden, paused, reduce]);

  const move = useCallback((act: Act) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepDream(current, act);
    if (next === current) {
      arm();
      if (!mutedRef.current && !pausedRef.current) audio.current?.tick("block");
      return;
    }
    const kind = act === "swap" ? "swap" : act === "down" ? "down" : current.laws[current.floor + 1] ? "rewrite" : "open";
    arm();
    note(kind, next);
    if (next.floor === current.floor) {
      setState(next);
      setShown(next);
      setGlide(null);
      setBusy(false);
      return;
    }
    glideSerial.current += 1;
    setShown(current);
    setState(next);
    setGlide({ id: glideSerial.current, fromFloor: current.floor, toFloor: next.floor });
    setBusy(true);
  }, [arm, note]);

  const load = useCallback((value: number) => {
    const next = createDream(value);
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
    arm();
    const next = resign(current);
    if (!mutedRef.current) audio.current?.tick("lose");
    glideSerial.current += 1;
    setState(next);
    setShown(next);
    setGlide(null);
    setBusy(false);
  }, [arm]);

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
      const act = codeAct(event.code);
      if (!act) return;
      event.preventDefault();
      move(act);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const locked = paused || busy || state.status !== "play";
  const outcome = state.loseReason === "cap" ? copy.cap : copy.resigned;
  const open = new Set(openActs(state));
  const openNames = ACTS.filter((act) => open.has(act)).map((act) => copy[act]);
  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : openNames.length === 0
          ? copy.none
          : `${copy.playing} ${openNames.join(" · ")}`;
  const handLabel = state.hand ? `${relicName(state.hand, copy)} · ${lawName(state.hand, copy)}` : copy.bare;

  const actButton = (act: Act, detail: string) => {
    const available = open.has(act);
    return (
      <button
        type="button"
        className={available ? controlClass("primary") : controlClass("quiet")}
        aria-label={`${copy[act]}. ${detail}`}
        disabled={locked || !available}
        onClick={() => move(act)}
      >
        {copy[act]}
        <span className="block text-xs font-normal">{detail}</span>
      </button>
    );
  };

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
        <p className="text-xs text-muted-foreground">{copy.keys}</p>
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
      <p className="text-sm text-foreground">
        <b>{copy.holding}</b> {handLabel}
      </p>
      <ol className="space-y-2">
        {Array.from({ length: FLOOR_COUNT }, (_, index) => (
          <li key={`floor-line-${index}`} className={floorClass(index === state.floor)}>
            <span className="tabular-nums">{index}</span> {floorLine(index, state, copy)}
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      {state.status !== "play" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-foreground">
              {state.status === "win" ? "✨ 꿈의 최상층 도달!" : "🌙 한도 내 엘리베이터 정지"}
            </p>
            <p className="text-xs text-muted-foreground">
              {state.status === "win" ? `${state.floor}층의 봉인을 풀고 꿈의 꼭대기에 도달했습니다.` : outcome}
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
          <DreamElevatorScene
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
        <p id="dream-elevator-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="dream-elevator-acts" className="grid gap-2">
          {actButton("up", upDetail(state, copy))}
          {actButton("swap", swapDetail(state, copy))}
          {actButton("down", state.floor <= 0 ? copy.bottom : copy.downHint)}
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
