/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 계절 중 시드가 고른 한 연못만 보여 준다.
 * 획의 종류가 생물을 정한다. 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 동쪽은 화면 오른쪽이다. 이 계절의 기록은 화면에만 남긴다.
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
  LEGS,
  SPORE,
  STEP_CAP,
  createPond,
  nextSeed,
  resign,
  stepPond,
  type Act,
  type PondState,
} from "../../lib/games/ink-ecology";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import InkEcologyScene, { type PondGlide } from "./InkEcologyScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  spore: string;
  wind: string;
  legs: string;
  empty: string;
  pond: string;
  markSpore: string;
  markLegs: string;
  none: string;
  noEmpty: string;
  noSpore: string;
  wait: string;
  sporeHint: string;
  legsHint: string;
  eatHint: string;
  windHint: string;
  blownHint: string;
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
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "잉크 생태계",
    lead: "원은 서쪽 빈 연못에 포자를 낳고, 직선은 동쪽 빈 연못에 다리를 세웁니다. 다리가 서는 칸의 바로 서쪽에 포자가 있으면 그 포자는 먹힙니다. 바람은 가장 동쪽 포자만 한 칸 동쪽으로 밀고, 그 칸이 다리이거나 연못 밖이면 포자는 사라집니다. 연못이 표식과 같아지면 그 계절이 끝납니다.",
    keys: "왼쪽·A는 원, 아래·S는 바람, 오른쪽·D는 직선입니다. V는 보기, Esc는 멈춤입니다. 동쪽은 화면 오른쪽이고, 보기를 바꿔도 생물은 그대로입니다. 다리는 한 번 서면 남지 않습니다. 이 계절은 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "획",
    seed: "시드",
    apply: "이 시드",
    next: "다른 계절",
    acts: "획",
    spore: "포자",
    wind: "바람",
    legs: "다리",
    empty: "빈 연못",
    pond: "연못",
    markSpore: "포자 표식",
    markLegs: "다리 표식",
    none: "없음",
    noEmpty: "빈 연못이 없습니다",
    noSpore: "밀 포자가 없습니다",
    wait: "지금은 조작이 멈춥니다",
    sporeHint: "서쪽 빈 연못에 포자가 앉습니다",
    legsHint: "동쪽 빈 연못에 다리가 섭니다",
    eatHint: "동쪽 빈 연못에 다리가 서며 바로 서쪽 포자를 먹습니다",
    windHint: "가장 동쪽 포자가 한 칸 동쪽으로 밀립니다",
    blownHint: "가장 동쪽 포자가 다리나 연못 끝에서 사라집니다",
    capHint: "이 획은 여덟 번째이고 표식과 같지 않습니다",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "그을 수 있는 획",
    stuck: "지금은 그을 수 없습니다.",
    win: "연못이 표식과 같아졌습니다. 이 계절이 끝났습니다.",
    cap: "여덟 획 안에 표식과 같지 못했습니다.",
    resigned: "이 계절을 포기했습니다.",
  },
  en: {
    title: "Ink Ecology",
    lead: "A circle births a spore on the western empty pond, and a straight stroke stands legs on the eastern empty pond. If a spore is immediately west of those legs, the spore is eaten. Wind pushes only the easternmost spore one pond east, and the spore vanishes if that pond is legs or past the shore. The season ends when the ponds match the mark.",
    keys: "Left or A is the circle, down or S is the wind, right or D is the straight stroke. V changes the view, Esc pauses. East is the right of the screen, and changing the view leaves the life where it is. Legs, once stood, do not leave. This season stays on this screen and is not saved on the device.",
    steps: "Strokes",
    seed: "Seed",
    apply: "Use seed",
    next: "Another season",
    acts: "Stroke",
    spore: "Spore",
    wind: "Wind",
    legs: "Legs",
    empty: "Empty",
    pond: "Pond",
    markSpore: "Spore mark",
    markLegs: "Leg mark",
    none: "None",
    noEmpty: "There is no empty pond",
    noSpore: "There is no spore to push",
    wait: "The controls are held",
    sporeHint: "A spore sits on the western empty pond",
    legsHint: "Legs stand on the eastern empty pond",
    eatHint: "Legs stand on the eastern empty pond and eat the spore just west",
    windHint: "The easternmost spore is pushed one pond east",
    blownHint: "The easternmost spore vanishes into legs or off the shore",
    capHint: "This is the eighth stroke and it misses the mark",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Open strokes",
    stuck: "Nothing can be drawn.",
    win: "The ponds match the mark. This season is over.",
    cap: "Eight strokes passed without matching the mark.",
    resigned: "You left this season.",
  },
  ja: {
    title: "インクの生態系",
    lead: "円は西の空いた池に胞子を生み、直線は東の空いた池に脚を立てます。その脚のすぐ西に胞子があれば、その胞子は食べられます。風は最も東の胞子だけを一池東へ押し、その池が脚か池の外なら胞子は消えます。池が標識と揃うとその季節が終わります。",
    keys: "左・Aは円、下・Sは風、右・Dは直線です。Vは視点、Escは一時停止。東は画面の右で、視点を変えても生物はそのままです。脚は一度立つと残りません。この季節はこの画面だけに残り、端末には保存されません。",
    steps: "筆",
    seed: "シード",
    apply: "このシード",
    next: "別の季節",
    acts: "筆",
    spore: "胞子",
    wind: "風",
    legs: "脚",
    empty: "空池",
    pond: "池",
    markSpore: "胞子の標識",
    markLegs: "脚の標識",
    none: "なし",
    noEmpty: "空いた池がありません",
    noSpore: "押す胞子がありません",
    wait: "いまは操作が止まります",
    sporeHint: "西の空いた池に胞子が座ります",
    legsHint: "東の空いた池に脚が立ちます",
    eatHint: "東の空いた池に脚が立ち、すぐ西の胞子を食べます",
    windHint: "最も東の胞子が一池東へ押されます",
    blownHint: "最も東の胞子が脚か池の端で消えます",
    capHint: "この筆は八本目で、標識と揃いません",
    pause: "一時停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "止まっています。続けると戻ります。",
    playing: "引ける筆",
    stuck: "いまは引けません。",
    win: "池が標識と揃いました。この季節は終わりです。",
    cap: "八筆のうちに標識と揃いませんでした。",
    resigned: "この季節をあきらめました。",
  },
  zh: {
    title: "墨水生态",
    lead: "圆圈在西边的空池里生出孢子，直线在东边的空池里立起腿。腿落下的前一格如果是孢子，那颗孢子会被吃掉。风只把最东边的孢子向东推一池，那一池是腿或池外时，孢子就消失。池面和标记一致，这个季节就结束。",
    keys: "左或 A 是圆圈，下或 S 是风，右或 D 是直线。V 换视角，Esc 暂停。东是画面右侧，换视角不会移动生物。腿一旦站下就不会离开。这个季节只留在这个画面上，不会写进设备。",
    steps: "笔",
    seed: "种子",
    apply: "使用种子",
    next: "另一个季节",
    acts: "一笔",
    spore: "孢子",
    wind: "风",
    legs: "腿",
    empty: "空池",
    pond: "池",
    markSpore: "孢子标记",
    markLegs: "腿的标记",
    none: "无",
    noEmpty: "没有空池",
    noSpore: "没有可推的孢子",
    wait: "现在不能操作",
    sporeHint: "孢子坐上西边的空池",
    legsHint: "腿站上东边的空池",
    eatHint: "腿站上东边的空池，并吃掉紧西边的孢子",
    windHint: "最东边的孢子向东推一池",
    blownHint: "最东边的孢子在腿上或池边消失",
    capHint: "这是第八笔，而且和标记不同",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "静音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后回来。",
    playing: "可以画的一笔",
    stuck: "现在不能画。",
    win: "池面和标记一致了。这个季节结束了。",
    cap: "八笔之内没有和标记一致。",
    resigned: "你离开了这个季节。",
  },
  fr: {
    title: "Écologie d'encre",
    lead: "Un cercle fait naître une spore sur l'étang vide de l'ouest, et un trait droit dresse des pattes sur l'étang vide de l'est. Si une spore est juste à l'ouest de ces pattes, elle est mangée. Le vent ne pousse que la spore la plus à l'est, d'un étang, et elle disparaît si cet étang est des pattes ou au-delà du bord. La saison finit quand les étangs égalent la marque.",
    keys: "Gauche ou A est le cercle, bas ou S le vent, droite ou D le trait droit. V change la vue, Échap met en pause. L'est est à droite de l'écran, et changer la vue laisse la vie en place. Les pattes, une fois debout, ne partent pas. Cette saison reste sur cet écran et n'est pas écrite sur l'appareil.",
    steps: "Traits",
    seed: "Graine",
    apply: "Cette graine",
    next: "Une autre saison",
    acts: "Trait",
    spore: "Spore",
    wind: "Vent",
    legs: "Pattes",
    empty: "Vide",
    pond: "Étang",
    markSpore: "Marque spore",
    markLegs: "Marque pattes",
    none: "Aucune",
    noEmpty: "Il n'y a pas d'étang vide",
    noSpore: "Aucune spore à pousser",
    wait: "Les commandes sont tenues",
    sporeHint: "Une spore s'assoit sur l'étang vide de l'ouest",
    legsHint: "Des pattes se dressent sur l'étang vide de l'est",
    eatHint: "Des pattes se dressent à l'est et mangent la spore juste à l'ouest",
    windHint: "La spore la plus à l'est avance d'un étang",
    blownHint: "La spore la plus à l'est disparaît dans les pattes ou hors du bord",
    capHint: "C'est le huitième trait et il manque la marque",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Traits ouverts",
    stuck: "Rien ne peut être tracé.",
    win: "Les étangs égalent la marque. Cette saison est finie.",
    cap: "Huit traits ont passé sans égaler la marque.",
    resigned: "Vous avez quitté cette saison.",
  },
  es: {
    title: "Ecología de tinta",
    lead: "Un círculo nace una espora en el estanque vacío del oeste, y un trazo recto pone patas en el estanque vacío del este. Si hay una espora justo al oeste de esas patas, se la comen. El viento empuja solo la espora más al este, un estanque, y la espora desaparece si ese estanque son patas o queda fuera de la orilla. La estación termina cuando los estanques igualan la marca.",
    keys: "Izquierda o A es el círculo, abajo o S el viento, derecha o D el trazo recto. V cambia la vista, Esc pausa. El este queda a la derecha de la pantalla, y cambiar la vista deja la vida donde está. Las patas, una vez puestas, no se van. Esta estación se queda en esta pantalla y no se guarda en el aparato.",
    steps: "Trazos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otra estación",
    acts: "Trazo",
    spore: "Espora",
    wind: "Viento",
    legs: "Patas",
    empty: "Vacío",
    pond: "Estanque",
    markSpore: "Marca de espora",
    markLegs: "Marca de patas",
    none: "Ninguna",
    noEmpty: "No hay estanque vacío",
    noSpore: "No hay espora que empujar",
    wait: "Los mandos están retenidos",
    sporeHint: "Una espora se sienta en el estanque vacío del oeste",
    legsHint: "Unas patas se paran en el estanque vacío del este",
    eatHint: "Unas patas se paran al este y se comen la espora justo al oeste",
    windHint: "La espora más al este avanza un estanque",
    blownHint: "La espora más al este desaparece en las patas o fuera de la orilla",
    capHint: "Este es el octavo trazo y no iguala la marca",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Trazos abiertos",
    stuck: "Ahora no se puede trazar.",
    win: "Los estanques igualan la marca. Esta estación terminó.",
    cap: "Pasaron ocho trazos sin igualar la marca.",
    resigned: "Dejaste esta estación.",
  },
};

type Tick = "spore" | "legs" | "wind" | "win" | "lose";

interface PondAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createPondAudio(): PondAudio {
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
      if (kind === "spore") {
        blip(ctx, 220, 0.08, 0.024);
        return;
      }
      if (kind === "legs") {
        blip(ctx, 150, 0.09, 0.026);
        return;
      }
      if (kind === "wind") {
        blip(ctx, 96, 0.12, 0.02);
        return;
      }
      if (kind === "win") {
        blip(ctx, 330, 0.18, 0.03);
        blip(ctx, 415, 0.26, 0.02);
        return;
      }
      blip(ctx, 74, 0.16, 0.034);
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
  if (ready) return "rounded-xl bg-card px-2 py-2 text-sm text-foreground";
  return "rounded-xl bg-muted px-2 py-2 text-sm text-muted-foreground";
}

function label(act: Act, copy: Copy): string {
  if (act === "C") return copy.spore;
  if (act === "L") return copy.legs;
  return copy.wind;
}

function shortcut(act: Act): string {
  if (act === "C") return "ArrowLeft A";
  if (act === "L") return "ArrowRight D";
  return "ArrowDown S";
}

function lifeName(cell: number, copy: Copy): string {
  if (cell === SPORE) return copy.spore;
  if (cell === LEGS) return copy.legs;
  return copy.empty;
}

function marks(cells: readonly number[], kind: number, empty: string): string {
  const found = cells.flatMap((cell, index) => (cell === kind ? [String(index + 1)] : []));
  if (found.length === 0) return empty;
  return found.join(" · ");
}

function detailFor(state: PondState, act: Act, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const next = stepPond(state, act);
  if (next === state) return act === "G" ? copy.noSpore : copy.noEmpty;
  if (next.loseReason === "cap") return copy.capHint;
  if (act === "C") return copy.sporeHint;
  if (act === "L") {
    const eaten = state.cells.some((cell, index) => cell === SPORE && next.cells[index] !== SPORE);
    return eaten ? copy.eatHint : copy.legsHint;
  }
  const before = state.cells.filter((cell) => cell === SPORE).length;
  const after = next.cells.filter((cell) => cell === SPORE).length;
  return after < before ? copy.blownHint : copy.windHint;
}

function codeAction(code: string): Act | null {
  if (code === "ArrowLeft" || code === "KeyA") return "C";
  if (code === "ArrowRight" || code === "KeyD") return "L";
  if (code === "ArrowDown" || code === "KeyS") return "G";
  return null;
}

const PAD: readonly Act[] = ["C", "G", "L"];

export default function InkEcology({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createPond(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<PondState>(opening.current);
  const [shown, setShown] = useState<PondState>(opening.current);
  const [glide, setGlide] = useState<PondGlide | null>(null);
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
  const audio = useRef<PondAudio | null>(null);
  if (!audio.current) audio.current = createPondAudio();
  stateRef.current = state;
  pausedRef.current = paused;
  mutedRef.current = muted;
  busyRef.current = busy;

  const handleShareCard = useCallback(async () => {
    const canvas = createShareCardCanvas({
      title: "3D Ink Ecology",
      subtitle: state.status === "win" ? "수묵 연못 조화 완성" : "수묵 생태계 탐색 기록",
      score: state.status === "win" ? `${state.steps}수 완성` : `${state.steps}수 진행`,
      slug: "ink-ecology",
      customStats: [
        { label: "SEED", value: `#${seed}` },
        { label: "STEPS", value: `${state.steps}/${STEP_CAP}` },
        { label: "STATUS", value: state.status === "win" ? "조화 (WIN)" : state.status === "lose" ? "정체 (LOSE)" : "번식 중" },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `ink-ecology-${seed}.png`);
    }
  }, [seed, state.status, state.steps]);

  const prevStatusRef = useRef(state.status);
  useEffect(() => {
    if (state.status !== prevStatusRef.current && containerRef.current) {
      if (state.status === "win") {
        celebrate(containerRef.current, { preset: "tiles" });
      }
    }
    prevStatusRef.current = state.status;
  }, [state.status, containerRef]);
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
    const next = createPond(fromUrl);
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

  const begin = useCallback((next: PondState, kind: Tick) => {
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
    const next = stepPond(current, act);
    if (next === current) return;
    const kind: Tick = next.status === "win"
      ? "win"
      : next.status === "lose"
        ? "lose"
        : act === "C"
          ? "spore"
          : act === "L"
            ? "legs"
            : "wind";
    begin(next, kind);
  }, [begin]);

  const load = useCallback((value: number) => {
    const next = createPond(value);
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
    const next = stepPond(state, act);
    return next !== state && next.status === "play";
  }).map((act) => label(act, copy));
  const matched = state.cells.every((cell, index) => cell === state.goal[index]);
  const outcome = state.loseReason === "cap" ? copy.cap : copy.resigned;
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
      <p className="text-sm text-muted-foreground">
        {copy.markSpore} {marks(state.goal, SPORE, copy.none)} · {copy.markLegs} {marks(state.goal, LEGS, copy.none)}
      </p>
      <ol aria-label={copy.pond} className="grid grid-cols-5 gap-2 text-center">
        {state.cells.map((cell, index) => (
          <li key={index} className={gaugeClass(cell === state.goal[index])}>
            <b className="tabular-nums">{index + 1}</b>
            <span className="block text-xs">{lifeName(cell, copy)}</span>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{matched && state.status === "play" ? copy.win : live}</p>
      {state.status !== "play" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-bold text-foreground">
              {state.status === "win" ? "✨ 수묵 연못 생태계 완성!" : "🍂 번식 한계 도달"}
            </p>
            <p className="text-xs text-muted-foreground">
              {state.status === "win" ? `${state.steps}수 만에 목표 연못 생태계와 조화를 이루었습니다.` : outcome}
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
          <InkEcologyScene
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
        <p id="ink-ecology-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="ink-ecology-acts" className="grid grid-cols-3 gap-2">
          {PAD.map((act) => {
            const next = stepPond(state, act);
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
