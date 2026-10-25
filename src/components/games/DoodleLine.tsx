/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 장 중 시드가 고른 한 장만 보여 준다.
 * 펜은 버튼으로 한 칸씩 잇고, 손을 떼야 적이 걷는다. 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 화면 위가 북쪽이고 화면 오른쪽이 동쪽이다. 이 장의 기록은 화면에만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Share2, Check } from "lucide-react";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import type { Locale } from "../../lib/i18n";
import { celebrate } from "../../lib/games/celebration";
import {
  createShareCardCanvas,
  copyShareCardToClipboard,
  downloadShareCard,
} from "../../lib/games/share-card";
import {
  ACTS,
  INK,
  ROWS,
  SPAWN,
  STEP_CAP,
  STONE,
  colOf,
  createLine,
  nextSeed,
  rejectReason,
  resign,
  stepLine,
  type Act,
  type LineState,
} from "../../lib/games/doodle-line";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import DoodleLineScene, { type LineGlide } from "./DoodleLineScene";

interface Copy {
  title: string;
  lead: string;
  keys: string;
  steps: string;
  seed: string;
  apply: string;
  next: string;
  acts: string;
  north: string;
  east: string;
  south: string;
  west: string;
  release: string;
  ink: string;
  stone: string;
  empty: string;
  pen: string;
  threat: string;
  page: string;
  waiting: string;
  breached: string;
  stoppedNorth: string;
  stoppedMiddle: string;
  stoppedSouth: string;
  off: string;
  stoneBlock: string;
  inkBlock: string;
  wait: string;
  drawHint: string;
  releaseHint: string;
  breachHint: string;
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
  breach: string;
  resigned: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "낙서 방어선",
    lead: "펜은 이어진 한 획만 그립니다. 돌은 지나가지 못하고, 이미 그린 칸으로는 돌아가지 않습니다. 손을 떼면 적이 북쪽 끝에서 남쪽으로 걸어오고, 그 줄에 잉크가 있으면 막히고 없으면 기지가 뚫립니다.",
    keys: "위·W는 북, 오른쪽·D는 동, 아래·S는 남, 왼쪽·A는 서입니다. 스페이스·H는 손 떼기, V는 보기, Esc는 멈춤입니다. 화면 위가 북쪽이고 열 번호는 1부터입니다. 보기를 바꿔도 획은 그대로입니다. 이 장은 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "획",
    seed: "시드",
    apply: "이 시드",
    next: "다른 장",
    acts: "획",
    north: "북",
    east: "동",
    south: "남",
    west: "서",
    release: "손 떼기",
    ink: "잉크",
    stone: "돌",
    empty: "빈칸",
    pen: "펜",
    threat: "위협",
    page: "종이",
    waiting: "북쪽 대기",
    breached: "뚫림",
    stoppedNorth: "맨 위 잉크에서 멈춤",
    stoppedMiddle: "가운데 잉크에서 멈춤",
    stoppedSouth: "아래 잉크에서 멈춤",
    off: "판 밖입니다",
    stoneBlock: "돌은 지나가지 못합니다",
    inkBlock: "이미 그린 칸입니다",
    wait: "지금은 조작이 멈춥니다",
    drawHint: "그 칸으로 획이 이어집니다",
    releaseHint: "손을 떼면 막힌 줄에서 적이 멈춥니다",
    breachHint: "빈 줄이 있어 기지가 뚫립니다",
    capHint: "이 획은 여덟 번째이고 손을 떼지 않습니다",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "이을 수 있는 획",
    stuck: "지금은 막을 수 없습니다.",
    win: "위협 줄이 모두 막혔습니다. 이 장이 끝났습니다.",
    cap: "여덟 획 안에 손을 떼지 못했습니다.",
    breach: "잉크가 없는 줄로 기지가 뚫렸습니다.",
    resigned: "이 장을 포기했습니다.",
  },
  en: {
    title: "Doodle Line",
    lead: "The pen draws one connected stroke. It cannot cross a stone or return to a cell it already inked. When you let go, enemies walk from the north edge toward the south, stop on ink in their column, and breach the base where a column is empty.",
    keys: "Up or W is north, right or D is east, down or S is south, left or A is west. Space or H lets go. V changes the view, Esc pauses. The top of the screen is north, and column numbers start at 1. Changing the view leaves the stroke where it is. This page stays on this screen and is not saved on the device.",
    steps: "Strokes",
    seed: "Seed",
    apply: "Use seed",
    next: "Another page",
    acts: "Stroke",
    north: "North",
    east: "East",
    south: "South",
    west: "West",
    release: "Let go",
    ink: "Ink",
    stone: "Stone",
    empty: "Empty",
    pen: "Pen",
    threat: "Threat",
    page: "Page",
    waiting: "Waiting north",
    breached: "Breached",
    stoppedNorth: "Stopped on the top ink",
    stoppedMiddle: "Stopped on the middle ink",
    stoppedSouth: "Stopped on the lower ink",
    off: "That cell is off the page",
    stoneBlock: "A stone blocks the pen",
    inkBlock: "That cell is already ink",
    wait: "The controls are held",
    drawHint: "The stroke continues into that cell",
    releaseHint: "Letting go stops each enemy on ink",
    breachHint: "An empty column lets the base fall",
    capHint: "This is the eighth stroke and the hand is still down",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Open strokes",
    stuck: "Nothing can seal the page.",
    win: "Every threatened column is inked. This page is over.",
    cap: "Eight strokes passed before the hand let go.",
    breach: "A column with no ink let the base fall.",
    resigned: "You left this page.",
  },
  ja: {
    title: "らくがき防衛線",
    lead: "ペンはつながった一筆だけを引きます。石は越えられず、すでに描いたマスへは戻れません。手を離すと敵は北の端から南へ歩き、その列にインクがあれば止まり、なければ基地が破れます。",
    keys: "上・Wは北、右・Dは東、下・Sは南、左・Aは西です。スペース・Hは手を離す、Vは視点、Escは一時停止。画面の上が北で、列番号は1からです。視点を変えても線はそのままです。この紙はこの画面だけに残り、端末には保存されません。",
    steps: "筆",
    seed: "シード",
    apply: "このシード",
    next: "別の紙",
    acts: "筆",
    north: "北",
    east: "東",
    south: "南",
    west: "西",
    release: "手を離す",
    ink: "インク",
    stone: "石",
    empty: "空",
    pen: "ペン",
    threat: "脅威",
    page: "紙",
    waiting: "北で待機",
    breached: "突破",
    stoppedNorth: "一番上のインクで停止",
    stoppedMiddle: "真ん中のインクで停止",
    stoppedSouth: "下のインクで停止",
    off: "紙の外です",
    stoneBlock: "石は通れません",
    inkBlock: "すでに描いたマスです",
    wait: "いまは操作が止まります",
    drawHint: "そのマスへ線が続きます",
    releaseHint: "手を離すと、インクのある列で敵が止まります",
    breachHint: "空いた列があり、基地が破れます",
    capHint: "この筆は八本目で、手はまだ離れません",
    pause: "一時停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "止まっています。続けると戻ります。",
    playing: "続けられる筆",
    stuck: "いまは防げません。",
    win: "脅威の列はすべて塞がりました。この紙は終わりです。",
    cap: "八筆のうちに手を離せませんでした。",
    breach: "インクのない列から基地が破れました。",
    resigned: "この紙をあきらめました。",
  },
  zh: {
    title: "涂鸦防线",
    lead: "笔只画一条相连的线。石头过不去，已经画过的格子也不能回头。松手后，敌人从北端向南走，那一列有墨就停下，没有墨基地就被突破。",
    keys: "上或 W 是北，右或 D 是东，下或 S 是南，左或 A 是西。空格或 H 松手。V 换视角，Esc 暂停。画面上方是北，列号从 1 开始。换视角不会改动笔画。这一页只留在这个画面上，不会写进设备。",
    steps: "笔",
    seed: "种子",
    apply: "使用种子",
    next: "另一页",
    acts: "一笔",
    north: "北",
    east: "东",
    south: "南",
    west: "西",
    release: "松手",
    ink: "墨",
    stone: "石头",
    empty: "空格",
    pen: "笔",
    threat: "威胁",
    page: "纸",
    waiting: "在北边等候",
    breached: "突破",
    stoppedNorth: "停在最上面的墨",
    stoppedMiddle: "停在中间的墨",
    stoppedSouth: "停在下面的墨",
    off: "出了纸面",
    stoneBlock: "石头过不去",
    inkBlock: "这一格已经画过",
    wait: "现在不能操作",
    drawHint: "笔画延续到那一格",
    releaseHint: "松手后，敌人停在有墨的列上",
    breachHint: "有空列，基地会被突破",
    capHint: "这是第八笔，手还没有松开",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "静音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后回来。",
    playing: "可以接上的一笔",
    stuck: "现在封不住。",
    win: "有威胁的列都挡住了。这一页结束了。",
    cap: "八笔之内没有松手。",
    breach: "没有墨的一列把基地冲开了。",
    resigned: "你离开了这一页。",
  },
  fr: {
    title: "Ligne gribouillée",
    lead: "Le stylo ne trace qu'un seul trait continu. Il ne traverse pas une pierre et ne revient pas sur une case déjà encrée. Quand la main lâche, les ennemis descendent depuis le bord nord, s'arrêtent sur l'encre de leur colonne, et percent la base si une colonne est vide.",
    keys: "Haut ou W va au nord, droite ou D à l'est, bas ou S au sud, gauche ou A à l'ouest. Espace ou H lâche la main. V change la vue, Échap met en pause. Le haut de l'écran est le nord, et les colonnes se comptent à partir de 1. Changer la vue laisse le trait en place. Cette page reste sur cet écran et n'est pas écrite sur l'appareil.",
    steps: "Traits",
    seed: "Graine",
    apply: "Cette graine",
    next: "Une autre page",
    acts: "Trait",
    north: "Nord",
    east: "Est",
    south: "Sud",
    west: "Ouest",
    release: "Lâcher",
    ink: "Encre",
    stone: "Pierre",
    empty: "Vide",
    pen: "Stylo",
    threat: "Menace",
    page: "Page",
    waiting: "En attente au nord",
    breached: "Percée",
    stoppedNorth: "Arrêt sur l'encre du haut",
    stoppedMiddle: "Arrêt sur l'encre du milieu",
    stoppedSouth: "Arrêt sur l'encre du bas",
    off: "Hors de la page",
    stoneBlock: "Une pierre arrête le stylo",
    inkBlock: "Cette case est déjà encrée",
    wait: "Les commandes sont tenues",
    drawHint: "Le trait continue dans cette case",
    releaseHint: "Lâcher arrête chaque ennemi sur l'encre",
    breachHint: "Une colonne vide laisse tomber la base",
    capHint: "C'est le huitième trait et la main tient encore",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Traits ouverts",
    stuck: "Rien ne peut fermer la page.",
    win: "Chaque colonne menacée est encrée. Cette page est finie.",
    cap: "Huit traits ont passé avant que la main lâche.",
    breach: "Une colonne sans encre a laissé tomber la base.",
    resigned: "Vous avez quitté cette page.",
  },
  es: {
    title: "Línea de garabatos",
    lead: "El lápiz traza un solo trazo seguido. No cruza una piedra ni vuelve a un puesto ya entintado. Al soltar, los enemigos bajan desde el borde norte, se paran en la tinta de su columna y abren la base si una columna queda vacía.",
    keys: "Arriba o W es el norte, derecha o D el este, abajo o S el sur, izquierda o A el oeste. Espacio o H suelta la mano. V cambia la vista, Esc pausa. Arriba en la pantalla es el norte, y las columnas se numeran desde 1. Cambiar la vista deja el trazo donde está. Esta hoja se queda en esta pantalla y no se guarda en el aparato.",
    steps: "Trazos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otra hoja",
    acts: "Trazo",
    north: "Norte",
    east: "Este",
    south: "Sur",
    west: "Oeste",
    release: "Soltar",
    ink: "Tinta",
    stone: "Piedra",
    empty: "Vacío",
    pen: "Lápiz",
    threat: "Amenaza",
    page: "Hoja",
    waiting: "Espera al norte",
    breached: "Abierta",
    stoppedNorth: "Parado en la tinta de arriba",
    stoppedMiddle: "Parado en la tinta del medio",
    stoppedSouth: "Parado en la tinta de abajo",
    off: "Fuera de la hoja",
    stoneBlock: "Una piedra corta el lápiz",
    inkBlock: "Ese puesto ya tiene tinta",
    wait: "Los mandos están retenidos",
    drawHint: "El trazo sigue a ese puesto",
    releaseHint: "Soltar para a cada enemigo sobre la tinta",
    breachHint: "Una columna vacía abre la base",
    capHint: "Este es el octavo trazo y la mano sigue abajo",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Trazos abiertos",
    stuck: "Ahora no se puede cerrar la hoja.",
    win: "Cada columna amenazada tiene tinta. Esta hoja terminó.",
    cap: "Pasaron ocho trazos antes de soltar la mano.",
    breach: "Una columna sin tinta abrió la base.",
    resigned: "Dejaste esta hoja.",
  },
};

type Tick = "draw" | "release" | "win" | "lose";

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
      if (kind === "draw") {
        blip(ctx, 240, 0.07, 0.022);
        return;
      }
      if (kind === "release") {
        blip(ctx, 140, 0.1, 0.02);
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
  if (tone === "danger") return "min-h-11 min-w-11 rounded-xl bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-40";
  if (tone === "live") return "min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
}

function gaugeClass(inked: boolean): string {
  if (inked) return "rounded-xl bg-card px-2 py-2 text-sm text-foreground";
  return "rounded-xl bg-muted px-2 py-2 text-sm text-muted-foreground";
}

function label(act: Act, copy: Copy): string {
  if (act === "N") return copy.north;
  if (act === "E") return copy.east;
  if (act === "S") return copy.south;
  if (act === "W") return copy.west;
  return copy.release;
}

function shortcut(act: Act): string {
  if (act === "N") return "ArrowUp W";
  if (act === "E") return "ArrowRight D";
  if (act === "S") return "ArrowDown S";
  if (act === "W") return "ArrowLeft A";
  return "Space H";
}

function cellWord(state: LineState, index: number, copy: Copy): string {
  if (index === state.tip && state.cells[index] === INK) return copy.pen;
  if (state.cells[index] === INK) return copy.ink;
  if (state.cells[index] === STONE) return copy.stone;
  if (state.threats.includes(colOf(index))) return copy.threat;
  return copy.empty;
}

function stopWord(row: number, copy: Copy): string {
  if (row === SPAWN) return copy.waiting;
  if (row === ROWS) return copy.breached;
  if (row === 0) return copy.stoppedNorth;
  if (row === 1) return copy.stoppedMiddle;
  return copy.stoppedSouth;
}

function detailFor(state: LineState, act: Act, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  const reason = rejectReason(state, act);
  if (reason === "off") return copy.off;
  if (reason === "stone") return copy.stoneBlock;
  if (reason === "ink") return copy.inkBlock;
  const next = stepLine(state, act);
  if (next.loseReason === "cap") return copy.capHint;
  if (next.loseReason === "breach") return copy.breachHint;
  if (act === "H") return copy.releaseHint;
  return copy.drawHint;
}

function codeAction(code: string): Act | null {
  if (code === "ArrowUp" || code === "KeyW") return "N";
  if (code === "ArrowRight" || code === "KeyD") return "E";
  if (code === "ArrowDown" || code === "KeyS") return "S";
  if (code === "ArrowLeft" || code === "KeyA") return "W";
  if (code === "Space" || code === "KeyH") return "H";
  return null;
}

const SLOTS: readonly (Act | null)[] = [null, "N", null, "W", "H", "E", null, "S", null];

export default function DoodleLine({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal, labels: portalLabels } = useArcadePortal({ locale });
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
  const [shareCardCopied, setShareCardCopied] = useState(false);
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

  const handleShareCard = useCallback(async () => {
    const s = stateRef.current;
    const canvas = createShareCardCanvas({
      title: "Doodle Line",
      subtitle: s.status === "win" ? "방어선 구축 성공" : "선 그리기 기록",
      score: `${s.steps}/${STEP_CAP} STEPS`,
      slug: "doodle-line",
      customStats: [
        { label: "SEED", value: `${seed}` },
        { label: "STATUS", value: s.status === "win" ? "CLEARED" : "FAILED" },
        { label: "THREATS", value: `${s.threats.length}개 방어` },
      ],
    });
    const ok = await copyShareCardToClipboard(canvas);
    if (ok) {
      setShareCardCopied(true);
      setTimeout(() => setShareCardCopied(false), 2000);
    } else {
      downloadShareCard(canvas, `doodle-line-seed${seed}.png`);
    }
  }, [seed]);

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

  const begin = useCallback((next: LineState, kind: Tick) => {
    arm();
    if (next.lastAction === "H") note("release");
    note(kind);
    if (next.status === "win" && containerRef.current) {
      celebrate(containerRef.current, { preset: "leaves" });
    }
    glideSerial.current += 1;
    setShown(stateRef.current);
    setState(next);
    setGlide({ id: glideSerial.current });
    setBusy(true);
  }, [arm, note, containerRef]);

  const move = useCallback((act: Act) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepLine(current, act);
    if (next === current) return;
    const kind: Tick = next.status === "win" ? "win" : next.status === "lose" ? "lose" : "draw";
    begin(next, kind);
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
      if (event.code === "KeyF") {
        event.preventDefault();
        togglePortal();
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
  }, [move, togglePortal]);

  const locked = paused || busy || state.status !== "play";
  const named = ACTS.filter((act) => {
    const next = stepLine(state, act);
    return next !== state && (next.status === "play" || next.status === "win");
  }).map((act) => label(act, copy));
  const outcome = state.loseReason === "cap"
    ? copy.cap
    : state.loseReason === "breach"
      ? copy.breach
      : copy.resigned;
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
        {state.threats.map((col) => `${col + 1} ${stopWord(state.caught[col] ?? SPAWN, copy)}`).join(" · ")}
      </p>
      <ol aria-label={copy.page} className="grid grid-cols-4 gap-2 text-center">
        {state.cells.map((cell, index) => (
          <li key={index} className={gaugeClass(cell === INK)}>
            <b className="tabular-nums">{colOf(index) + 1}</b>
            <span className="block text-xs">{cellWord(state, index, copy)}</span>
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      {(state.status === "win" || state.status === "lose") && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleShareCard}
            className="flex-1 py-3 px-4 rounded-xl border border-border bg-card hover:bg-muted font-bold text-sm text-foreground transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            {shareCardCopied ? <Check className="w-4 h-4 text-primary" /> : <Share2 className="w-4 h-4" />}
            {shareCardCopied ? "결과 복사 완료!" : "결과 카드 공유"}
          </button>
          <button
            type="button"
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:bg-primary/90 transition-colors"
            onClick={() => {
              arm();
              load(nextSeed(seed));
            }}
          >
            {copy.next}
          </button>
        </div>
      )}
      <div className={isImmersive ? "relative flex min-h-64 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card" : "relative overflow-hidden rounded-2xl border border-border bg-card"}>
        <div className={isImmersive ? "h-full min-h-64 w-full flex-1" : "h-96"} aria-hidden="true">
          <DoodleLineScene
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
        <p id="doodle-line-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="doodle-line-acts" className="grid grid-cols-3 gap-2">
          {SLOTS.map((act, index) => {
            if (!act) return <div key={`gap-${index}`} aria-hidden="true" />;
            const next = stepLine(state, act);
            const noop = next === state;
            const doomed = next.loseReason === "cap" || next.loseReason === "breach";
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
