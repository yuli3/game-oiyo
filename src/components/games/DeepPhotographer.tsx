/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 장면 중 시드가 고른 한 판만 보여 준다.
 * 빛을 올리면 빔 안의 생물은 어두운 쪽(화면 오른쪽)으로 한 칸 피하고, 포식자는 빛 쪽으로 한 칸 다가온다.
 * 빛을 내리면 생물은 그대로이고 포식자만 어둠으로 한 칸 물러난다.
 * 생물·표식·필요 밝기·포식자는 숨기지 않는다. 공격 버튼은 두지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 관제 음성은 두지 않는다. 끝난 뒤의 설명은 글만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  ACTIONS,
  STEP_CAP,
  createShot,
  inBeam,
  nextSeed,
  openActions,
  resign,
  stepShot,
  type Action,
  type MissKind,
  type ShotState,
} from "../../lib/games/deep-photographer";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import DeepPhotographerScene, { type ShotGlide } from "./DeepPhotographerScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  dim: string;
  bright: string;
  shutter: string;
  limit: string;
  wait: string;
  hintDim: string;
  hintBright: string;
  hintShutter: string;
  lampName: string;
  needName: string;
  fishName: string;
  markName: string;
  hunterName: string;
  inBeam: string;
  outBeam: string;
  missLead: string;
  lampHigh: string;
  lampLow: string;
  subjectOff: string;
  predatorIn: string;
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
  taken: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "심해 사진가",
    lead: "빛을 올리면 빔 안의 생물은 어두운 쪽(화면 오른쪽)으로 한 칸 피하고 포식자는 빛 쪽으로 한 칸 다가옵니다. 빛을 내리면 생물은 그대로이고 포식자만 어둠으로 한 칸 물러납니다. 생물이 표식 위에 있고, 밝기가 그 장면과 같고, 포식자가 빔 밖에 있을 때 셔터가 그 한 장면을 남깁니다.",
    keys: "칸은 왼쪽 램프에서 오른쪽으로 1부터 셉니다. 밝기 2는 1번과 2번 칸만 비추고, 밝기 0이면 해구는 전부 어둡습니다. Q는 빛을 내리고 E는 올립니다. F는 셔터, V는 보기, Esc는 멈춤입니다. 이 배에는 공격이 없습니다. 보기를 바꿔도 생물과 밝기는 그대로입니다.",
    steps: "걸음",
    seed: "시드",
    apply: "이 시드",
    next: "다른 장면",
    acts: "조작",
    dim: "빛 내리기",
    bright: "빛 올리기",
    shutter: "셔터",
    limit: "그 방향으로는 더 못 움직입니다",
    wait: "지금은 조작이 멈춥니다",
    hintDim: "생물은 그대로 두고 포식자만 어둠으로 한 칸 물러납니다",
    hintBright: "빔 안의 생물은 오른쪽으로 한 칸 피하고, 포식자는 램프로 한 칸 다가옵니다",
    hintShutter: "생물이 표식 위, 밝기가 장면과 같고, 포식자가 빔 밖일 때만 남습니다",
    lampName: "밝기",
    needName: "이 장면",
    fishName: "생물",
    markName: "표식",
    hunterName: "포식자",
    inBeam: "빔 안",
    outBeam: "빔 밖",
    missLead: "그 장면은 남지 않았습니다.",
    lampHigh: "밝기가 장면보다 높습니다.",
    lampLow: "밝기가 장면보다 낮습니다.",
    subjectOff: "생물이 표식 위에 있지 않습니다.",
    predatorIn: "포식자가 빔 안에 있습니다.",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "갈 수 있는 조작",
    none: "지금은 움직일 수 없습니다.",
    win: "밝기와 표식과 포식자가 맞아 그 한 장면이 남았습니다.",
    cap: "여덟 걸음 안에 그 장면을 남기지 못했습니다.",
    resigned: "이 장면을 포기했습니다.",
    taken: "포식자가 생물에게 닿아 장면을 잃었습니다.",
  },
  en: {
    title: "Deep Photographer",
    lead: "Raising the lamp sends a creature inside the new beam one station toward the dark, on the right of the screen, and draws the predator one station toward the lamp. Lowering the lamp leaves the creature where it is and only the predator steps back into the dark. The shutter keeps that one scene when the creature stands on the mark, the lamp matches the scene, and the predator is outside the beam.",
    keys: "Stations count from 1 at the lamp on the left toward the right. Brightness 2 lights only stations 1 and 2. Brightness 0 leaves the trench dark. Q lowers the lamp and E raises it. F is the shutter, V changes the view, Esc pauses. This boat has no attack. Changing the view leaves the creature and the lamp as they are.",
    steps: "Steps",
    seed: "Seed",
    apply: "Use seed",
    next: "Another scene",
    acts: "Controls",
    dim: "Lower the lamp",
    bright: "Raise the lamp",
    shutter: "Shutter",
    limit: "That direction is already at its stop",
    wait: "The controls are held",
    hintDim: "The creature stays, and only the predator steps one station into the dark",
    hintBright: "A creature in the beam flees one station right, and the predator steps one station toward the lamp",
    hintShutter: "The scene stays only when the creature is on the mark, the lamp matches, and the predator is outside the beam",
    lampName: "Lamp",
    needName: "This scene",
    fishName: "Creature",
    markName: "Mark",
    hunterName: "Predator",
    inBeam: "in the beam",
    outBeam: "outside the beam",
    missLead: "That scene was not kept.",
    lampHigh: "The lamp is brighter than the scene.",
    lampLow: "The lamp is darker than the scene.",
    subjectOff: "The creature is not on the mark.",
    predatorIn: "The predator is inside the beam.",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Open controls",
    none: "Nothing can move.",
    win: "The lamp, the mark, and the predator lined up, so that one scene stayed.",
    cap: "Eight steps passed without keeping the scene.",
    resigned: "You left this scene.",
    taken: "The predator reached the creature, so the scene was lost.",
  },
  ja: {
    title: "深海の写真家",
    lead: "光を上げると、新しいビームの中の生物は画面右の暗い方へ一マス避け、捕食者はランプの方へ一マス近づきます。光を下げると生物はそのままで、捕食者だけが一マス闇へ下がります。生物が標識の上にいて、明るさがその場面と等しく、捕食者がビームの外にいるとき、シャッターがその一場面を残します。",
    keys: "マスは左のランプから右へ1から数えます。明るさ2は1番と2番だけを照らし、明るさ0では海溝は全部暗いです。Qで光を下げ、Eで上げます。Fはシャッター、Vは視点、Escは一時停止。この船に攻撃はありません。視点を変えても生物と明るさはそのままです。",
    steps: "歩数",
    seed: "シード",
    apply: "このシード",
    next: "別の場面",
    acts: "操作",
    dim: "光を下げる",
    bright: "光を上げる",
    shutter: "シャッター",
    limit: "その方向はこれ以上動きません",
    wait: "いまは操作が止まります",
    hintDim: "生物はそのままで、捕食者だけが闇へ一マス下がります",
    hintBright: "ビームの中の生物は右へ一マス避け、捕食者はランプへ一マス近づきます",
    hintShutter: "生物が標識の上、明るさが場面と等しく、捕食者がビームの外のときだけ残ります",
    lampName: "明るさ",
    needName: "この場面",
    fishName: "生物",
    markName: "標識",
    hunterName: "捕食者",
    inBeam: "ビームの中",
    outBeam: "ビームの外",
    missLead: "その場面は残りませんでした。",
    lampHigh: "明るさが場面より高いです。",
    lampLow: "明るさが場面より低いです。",
    subjectOff: "生物が標識の上にいません。",
    predatorIn: "捕食者がビームの中にいます。",
    pause: "一時停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "止まっています。続けると戻ります。",
    playing: "できる操作",
    none: "いまは動けません。",
    win: "明るさと標識と捕食者が揃い、その一場面が残りました。",
    cap: "八歩のうちにその場面を残せませんでした。",
    resigned: "この場面をあきらめました。",
    taken: "捕食者が生物に届き、場面を失いました。",
  },
  zh: {
    title: "深海摄影师",
    lead: "把光调亮时，进入新光束的生物会向画面右侧的暗处躲一格，捕食者则向灯的方向靠近一格。把光调暗时，生物不动，只有捕食者向暗处退一格。生物站在标记上、亮度与这一幕所需相同、捕食者在光束之外时，快门留下这一幕。",
    keys: "格子从左边的灯往右，从1开始数。亮度2只照亮第1格和第2格，亮度0时海沟全是暗的。Q 调暗，E 调亮。F 是快门，V 换视角，Esc 暂停。这艘船上没有攻击。换视角不会改生物和亮度。",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "另一幕",
    acts: "操作",
    dim: "调暗",
    bright: "调亮",
    shutter: "快门",
    limit: "这个方向已经到头",
    wait: "现在不能操作",
    hintDim: "生物留在原地，只有捕食者向暗处退一格",
    hintBright: "光束里的生物向右躲一格，捕食者向灯靠近一格",
    hintShutter: "只有生物在标记上、亮度与这一幕相同、捕食者在光束外时才会留下",
    lampName: "亮度",
    needName: "这一幕",
    fishName: "生物",
    markName: "标记",
    hunterName: "捕食者",
    inBeam: "光束内",
    outBeam: "光束外",
    missLead: "这一幕没有留下。",
    lampHigh: "亮度比这一幕高。",
    lampLow: "亮度比这一幕低。",
    subjectOff: "生物不在标记上。",
    predatorIn: "捕食者在光束里。",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "静音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后回来。",
    playing: "可以做的操作",
    none: "现在不能动。",
    win: "亮度、标记和捕食者都对上了，这一幕留下来了。",
    cap: "八步之内没有留下这一幕。",
    resigned: "你离开了这一幕。",
    taken: "捕食者碰到了生物，这一幕丢了。",
  },
  fr: {
    title: "Photographe des abysses",
    lead: "Monter la lampe fait fuir d'une station, vers le noir à droite de l'écran, la créature qui entre dans le faisceau, et le prédateur avance d'une station vers la lampe. Baisser la lampe laisse la créature en place : seul le prédateur recule d'une station dans le noir. Le déclencheur garde cette scène unique quand la créature est sur le repère, la lampe est celle de la scène, et le prédateur est hors du faisceau.",
    keys: "Les stations se comptent à partir de 1, de la lampe à gauche vers la droite. La clarté 2 n'éclaire que les stations 1 et 2. La clarté 0 laisse la fosse noire. Q baisse la lampe, E la monte. F déclenche, V change la vue, Échap met en pause. Ce bateau n'a pas d'attaque. Changer la vue laisse la créature et la lampe telles quelles.",
    steps: "Pas",
    seed: "Graine",
    apply: "Cette graine",
    next: "Une autre scène",
    acts: "Commandes",
    dim: "Baisser la lampe",
    bright: "Monter la lampe",
    shutter: "Déclencheur",
    limit: "Ce sens est déjà en butée",
    wait: "Les commandes sont tenues",
    hintDim: "La créature reste, et seul le prédateur recule d'une station dans le noir",
    hintBright: "La créature dans le faisceau fuit d'une station vers la droite, et le prédateur avance d'une station vers la lampe",
    hintShutter: "La scène reste seulement si la créature est sur le repère, la lampe correspond, et le prédateur est hors du faisceau",
    lampName: "Lampe",
    needName: "Cette scène",
    fishName: "Créature",
    markName: "Repère",
    hunterName: "Prédateur",
    inBeam: "dans le faisceau",
    outBeam: "hors du faisceau",
    missLead: "Cette scène n'a pas été gardée.",
    lampHigh: "La lampe est plus claire que la scène.",
    lampLow: "La lampe est plus sombre que la scène.",
    subjectOff: "La créature n'est pas sur le repère.",
    predatorIn: "Le prédateur est dans le faisceau.",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Commandes ouvertes",
    none: "Rien ne peut bouger.",
    win: "La lampe, le repère et le prédateur étaient alignés, alors cette scène unique est restée.",
    cap: "Huit pas ont passé sans garder la scène.",
    resigned: "Vous avez quitté cette scène.",
    taken: "Le prédateur a rejoint la créature, et la scène est perdue.",
  },
  es: {
    title: "Fotógrafo del abismo",
    lead: "Subir la luz hace que el animal dentro del haz retroceda un puesto hacia la oscuridad, a la derecha de la pantalla, y que el depredador avance un puesto hacia la lámpara. Bajar la luz deja al animal quieto y solo el depredador se retira un puesto hacia lo oscuro. El obturador guarda esa única escena cuando el animal está sobre la marca, la luz es la de la escena y el depredador queda fuera del haz.",
    keys: "Los puestos se cuentan desde 1, de la lámpara a la izquierda hacia la derecha. La claridad 2 alumbra solo los puestos 1 y 2. La claridad 0 deja la fosa a oscuras. Q baja la luz y E la sube. F es el obturador, V cambia la vista, Esc pausa. Este barco no tiene ataque. Cambiar la vista deja al animal y a la luz como están.",
    steps: "Pasos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otra escena",
    acts: "Mandos",
    dim: "Bajar la luz",
    bright: "Subir la luz",
    shutter: "Obturador",
    limit: "Ese sentido ya está en el tope",
    wait: "Los mandos están retenidos",
    hintDim: "El animal se queda, y solo el depredador retrocede un puesto hacia lo oscuro",
    hintBright: "El animal dentro del haz huye un puesto a la derecha, y el depredador avanza un puesto hacia la lámpara",
    hintShutter: "La escena se queda solo si el animal está sobre la marca, la luz coincide y el depredador está fuera del haz",
    lampName: "Luz",
    needName: "Esta escena",
    fishName: "Animal",
    markName: "Marca",
    hunterName: "Depredador",
    inBeam: "dentro del haz",
    outBeam: "fuera del haz",
    missLead: "Esa escena no se quedó.",
    lampHigh: "La luz está más alta que la escena.",
    lampLow: "La luz está más baja que la escena.",
    subjectOff: "El animal no está sobre la marca.",
    predatorIn: "El depredador está dentro del haz.",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Mandos abiertos",
    none: "Ahora no se mueve nada.",
    win: "La luz, la marca y el depredador coincidieron, así que esa única escena se quedó.",
    cap: "Pasaron ocho pasos sin guardar la escena.",
    resigned: "Dejaste esta escena.",
    taken: "El depredador alcanzó al animal y la escena se perdió.",
  },
};

type Tick = "nudge" | "block" | "win" | "miss" | "lose";

interface ShotAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createShotAudio(): ShotAudio {
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
      if (kind === "nudge") {
        blip(ctx, 196, 0.07, 0.028);
        return;
      }
      if (kind === "block") {
        blip(ctx, 92, 0.06, 0.02);
        return;
      }
      if (kind === "win") {
        blip(ctx, 392, 0.18, 0.03);
        blip(ctx, 523, 0.26, 0.02);
        return;
      }
      if (kind === "miss") {
        blip(ctx, 74, 0.2, 0.04);
        return;
      }
      blip(ctx, 84, 0.14, 0.035);
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

function shutterClass(ready: boolean): string {
  if (ready) return "min-h-11 w-full rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 w-full rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
}

function gaugeClass(ready: boolean): string {
  if (ready) return "rounded-xl bg-card px-3 py-2 text-sm text-foreground";
  return "rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground";
}

function label(action: Action, copy: Copy): string {
  if (action === "dim") return copy.dim;
  if (action === "bright") return copy.bright;
  return copy.shutter;
}

function hint(action: Action, copy: Copy): string {
  if (action === "dim") return copy.hintDim;
  if (action === "bright") return copy.hintBright;
  return copy.hintShutter;
}

function shortcut(action: Action): string {
  if (action === "dim") return "Q";
  if (action === "bright") return "E";
  return "F";
}

function detailFor(state: ShotState, action: Action, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  if (stepShot(state, action) === state) return copy.limit;
  return hint(action, copy);
}

function missSentence(kind: MissKind, copy: Copy): string {
  if (kind === "lamp-high") return copy.lampHigh;
  if (kind === "lamp-low") return copy.lampLow;
  if (kind === "subject") return copy.subjectOff;
  return copy.predatorIn;
}

function codeAction(code: string): Action | null {
  if (code === "KeyQ") return "dim";
  if (code === "KeyE") return "bright";
  if (code === "KeyF") return "shutter";
  return null;
}

const LAMP_ACTIONS: readonly Action[] = ["dim", "bright"];

export default function DeepPhotographer({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createShot(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<ShotState>(opening.current);
  const [shown, setShown] = useState<ShotState>(opening.current);
  const [glide, setGlide] = useState<ShotGlide | null>(null);
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
  const audio = useRef<ShotAudio | null>(null);
  if (!audio.current) audio.current = createShotAudio();
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
    const next = createShot(fromUrl);
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

  const begin = useCallback((next: ShotState, kind: Tick) => {
    arm();
    note(kind);
    glideSerial.current += 1;
    setShown(stateRef.current);
    setState(next);
    setGlide({ id: glideSerial.current });
    setBusy(true);
  }, [arm, note]);

  const move = useCallback((action: Action) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepShot(current, action);
    if (next === current) {
      arm();
      if (!mutedRef.current && !pausedRef.current) audio.current?.tick("block");
      return;
    }
    const kind: Tick = action === "shutter"
      ? (next.status === "win" ? "win" : "miss")
      : next.status === "lose" ? "lose" : "nudge";
    begin(next, kind);
  }, [arm, begin]);

  const load = useCallback((value: number) => {
    const next = createShot(value);
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
      const action = codeAction(event.code);
      if (!action) return;
      event.preventDefault();
      move(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const locked = paused || busy || state.status !== "play";
  const open = new Set(openActions(state));
  const openNames = ACTIONS.filter((action) => open.has(action)).map((action) => label(action, copy));
  const outcome = state.loseReason === "taken"
    ? copy.taken
    : state.loseReason === "miss"
      ? `${copy.missLead} ${state.miss.map((kind) => missSentence(kind, copy)).join(" ")}`
      : state.loseReason === "cap"
        ? copy.cap
        : copy.resigned;
  const live = paused
    ? copy.paused
    : state.status === "win"
      ? copy.win
      : state.status === "lose"
        ? outcome
        : openNames.length === 0
          ? copy.none
          : `${copy.playing} ${openNames.join(" · ")}`;
  const shutterReady = !locked && open.has("shutter");

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
      <ol className="grid gap-2">
        <li className={gaugeClass(state.lamp === state.need)}>
          {copy.lampName} {state.lamp} · {copy.needName} {state.need}
        </li>
        <li className={gaugeClass(state.subject === state.seat)}>
          {copy.fishName} {state.subject + 1} · {copy.markName} {state.seat + 1}
        </li>
        <li className={gaugeClass(!inBeam(state.predator, state.lamp))}>
          {copy.hunterName} {state.predator + 1} · {inBeam(state.predator, state.lamp) ? copy.inBeam : copy.outBeam}
        </li>
      </ol>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-96" aria-hidden="true">
          <DeepPhotographerScene
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
        <p id="deep-photographer-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="deep-photographer-acts" className="grid grid-cols-2 gap-2">
          {LAMP_ACTIONS.map((action) => {
            const available = open.has(action);
            const detail = detailFor(state, action, copy);
            return (
              <button
                key={action}
                type="button"
                className={available ? controlClass("primary") : controlClass("quiet")}
                aria-keyshortcuts={shortcut(action)}
                aria-label={`${label(action, copy)}. ${detail}`}
                disabled={locked || !available}
                onClick={() => move(action)}
              >
                {label(action, copy)}
                <span className="block text-xs font-normal">{detail}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={shutterClass(shutterReady)}
          aria-keyshortcuts="F"
          aria-label={`${copy.shutter}. ${detailFor(state, "shutter", copy)}`}
          disabled={!shutterReady}
          onClick={() => move("shutter")}
        >
          {copy.shutter}
          <span className="block text-xs font-normal">{detailFor(state, "shutter", copy)}</span>
        </button>
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
