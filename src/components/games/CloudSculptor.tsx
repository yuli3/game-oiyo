/**
 * 의도 (2026-10-15 세운): 화면은 손으로 맞춘 네 하늘 중 시드가 고른 한 판만 보여 준다.
 * 가운데 돌과 목표 칸은 숨기지 않는다. 구름을 더하는 버튼은 두지 않는다.
 * 끌어서 카메라를 돌리면 퍼즐이 아니라 시점이 이기므로 보기는 버튼만 쓴다.
 * 방향은 카메라가 아니라 하늘의 축이다. 카드는 이 방문의 화면에만 남긴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n";
import {
  DIRS,
  STEP_CAP,
  createCloud,
  nextSeed,
  openActions,
  resign,
  stepCloud,
  type CloudState,
  type Dir,
} from "../../lib/games/cloud-sculptor";
import { usePrefersReducedMotion } from "../../lib/games/reduced-motion";
import CloudSculptorScene, { type CloudGlide } from "./CloudSculptorScene";

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
  limit: string;
  wait: string;
  hint: string;
  cloudName: string;
  markName: string;
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
  scattered: string;
}

const COPY: Record<Locale, Copy> = {
  ko: {
    title: "구름 조각사",
    lead: "가운데 돌은 바람이 지나지 못합니다. 바람을 한 방향으로 깎으면 구름은 그쪽으로 한 칸 밀리고, 돌에 닿거나 판 밖으로 나간 덩이는 흩어집니다. 남은 덩이가 목표 칸과 같으면 그 카드가 남습니다.",
    keys: "위·W는 북쪽, 오른쪽·D는 동쪽, 아래·S는 남쪽, 왼쪽·A는 서쪽입니다. V는 보기, Esc는 멈춤입니다. 방향은 카메라가 아니라 하늘의 축이고, 보기를 바꿔도 구름은 그대로입니다. 처음 구름은 목표보다 커서 전부 남길 수 없습니다. 카드는 이 화면에만 남고 기기에는 저장되지 않습니다.",
    steps: "걸음",
    seed: "시드",
    apply: "이 시드",
    next: "다른 하늘",
    acts: "바람",
    north: "북쪽",
    east: "동쪽",
    south: "남쪽",
    west: "서쪽",
    limit: "그 바람은 구름을 바꾸지 않습니다",
    wait: "지금은 조작이 멈춥니다",
    hint: "구름을 그쪽으로 한 칸 밀고, 돌이나 판 밖에 닿은 덩이는 흩어집니다",
    cloudName: "구름",
    markName: "목표",
    pause: "멈추기",
    resume: "이어하기",
    view: "보기",
    mute: "소리 끄기",
    sound: "소리 켜기",
    giveUp: "포기",
    paused: "멈췄습니다. 이어하기로 돌아옵니다.",
    playing: "갈 수 있는 바람",
    none: "지금은 움직일 수 없습니다.",
    win: "남은 구름이 목표와 같아 이 카드가 남았습니다.",
    cap: "여덟 걸음 안에 목표 형태가 되지 않았습니다.",
    resigned: "이 하늘을 포기했습니다.",
    scattered: "구름이 모두 흩어졌습니다.",
  },
  en: {
    title: "Cloud Sculptor",
    lead: "The center stone stops the wind. Carving the wind one way pushes the cloud one cell that way, and any puff that hits the stone or leaves the sky disperses. The card stays when the puffs that remain are exactly the marked cells.",
    keys: "Up or W is north, right or D is east, down or S is south, left or A is west. V changes the view, Esc pauses. Those directions are the sky, not the camera, and changing the view leaves the cloud where it is. The cloud you start with is larger than the mark, so it cannot all be kept. The card stays on this screen and is not saved on the device.",
    steps: "Steps",
    seed: "Seed",
    apply: "Use seed",
    next: "Another sky",
    acts: "Wind",
    north: "North",
    east: "East",
    south: "South",
    west: "West",
    limit: "That wind does not change the cloud",
    wait: "The controls are held",
    hint: "Push the cloud one cell that way. A puff that meets the stone or the edge disperses",
    cloudName: "Cloud",
    markName: "Mark",
    pause: "Pause",
    resume: "Resume",
    view: "View",
    mute: "Mute",
    sound: "Sound",
    giveUp: "Give up",
    paused: "Paused. Resume to return.",
    playing: "Open winds",
    none: "Nothing can move.",
    win: "The remaining cloud matched the mark, so this card stayed.",
    cap: "Eight steps passed without matching the mark.",
    resigned: "You left this sky.",
    scattered: "The whole cloud dispersed.",
  },
  ja: {
    title: "雲の彫刻家",
    lead: "中央の石は風を通しません。風を一方向に削ると雲はその方向へ一マス押し出され、石に触れた塊と空の外へ出た塊は散ります。残った塊が目標のマスと一致すると、そのカードが残ります。",
    keys: "上・Wは北、右・Dは東、下・Sは南、左・Aは西です。Vは視点、Escは一時停止。方向はカメラではなく空の軸で、視点を変えても雲はそのままです。最初の雲は目標より大きいので、全部は残せません。カードはこの画面だけに残り、端末には保存されません。",
    steps: "歩数",
    seed: "シード",
    apply: "このシード",
    next: "別の空",
    acts: "風",
    north: "北",
    east: "東",
    south: "南",
    west: "西",
    limit: "その風は雲を変えません",
    wait: "いまは操作が止まります",
    hint: "雲をその方向へ一マス押し、石か空の外に触れた塊は散ります",
    cloudName: "雲",
    markName: "目標",
    pause: "一時停止",
    resume: "続ける",
    view: "視点",
    mute: "音を消す",
    sound: "音を出す",
    giveUp: "あきらめる",
    paused: "止まっています。続けると戻ります。",
    playing: "できる風",
    none: "いまは動けません。",
    win: "残った雲が目標と一致し、このカードが残りました。",
    cap: "八歩のうちに目標の形になりませんでした。",
    resigned: "この空をあきらめました。",
    scattered: "雲がすべて散りました。",
  },
  zh: {
    title: "云雕塑家",
    lead: "正中的石头不让风通过。把风削向一个方向，云就向那边推一格，碰到石头或离开天空的云团会散掉。剩下的云团和标记的格子一致时，这张卡片留下。",
    keys: "上或 W 是北，右或 D 是东，下或 S 是南，左或 A 是西。V 换视角，Esc 暂停。这些方向是天空的轴，不是摄像机。换视角不会移动云。开局的云比标记大，所以不能全部留下。卡片只留在这个画面上，不会写进设备。",
    steps: "步数",
    seed: "种子",
    apply: "使用种子",
    next: "另一片天",
    acts: "风",
    north: "北",
    east: "东",
    south: "南",
    west: "西",
    limit: "这阵风没有改变云",
    wait: "现在不能操作",
    hint: "把云向那边推一格。碰到石头或天边的云团会散掉",
    cloudName: "云",
    markName: "标记",
    pause: "暂停",
    resume: "继续",
    view: "视角",
    mute: "静音",
    sound: "打开声音",
    giveUp: "放弃",
    paused: "已暂停。继续后回来。",
    playing: "可以削的风",
    none: "现在不能动。",
    win: "剩下的云和标记一致，这张卡片留下了。",
    cap: "八步之内没有变成标记的形状。",
    resigned: "你离开了这片天。",
    scattered: "云全部散了。",
  },
  fr: {
    title: "Sculpteur de nuages",
    lead: "La pierre du centre arrête le vent. Tailler le vent dans un sens pousse le nuage d'une case, et tout flocon qui touche la pierre ou quitte le ciel se disperse. La carte reste quand les flocons qui demeurent sont exactement les cases marquées.",
    keys: "Haut ou W est le nord, droite ou D l'est, bas ou S le sud, gauche ou A l'ouest. V change la vue, Échap met en pause. Ces sens sont ceux du ciel, pas ceux de la caméra, et changer la vue laisse le nuage en place. Le nuage du début est plus grand que la marque, donc on ne peut pas tout garder. La carte reste sur cet écran et n'est pas écrite sur l'appareil.",
    steps: "Pas",
    seed: "Graine",
    apply: "Cette graine",
    next: "Un autre ciel",
    acts: "Vent",
    north: "Nord",
    east: "Est",
    south: "Sud",
    west: "Ouest",
    limit: "Ce vent ne change pas le nuage",
    wait: "Les commandes sont tenues",
    hint: "Pousse le nuage d'une case. Un flocon qui rencontre la pierre ou le bord se disperse",
    cloudName: "Nuage",
    markName: "Marque",
    pause: "Pause",
    resume: "Reprendre",
    view: "Vue",
    mute: "Couper le son",
    sound: "Remettre le son",
    giveUp: "Abandonner",
    paused: "En pause. Reprendre pour revenir.",
    playing: "Vents ouverts",
    none: "Rien ne peut bouger.",
    win: "Le nuage restant est la marque, alors cette carte est restée.",
    cap: "Huit pas ont passé sans former la marque.",
    resigned: "Vous avez quitté ce ciel.",
    scattered: "Tout le nuage s'est dispersé.",
  },
  es: {
    title: "Escultor de nubes",
    lead: "La piedra del centro corta el viento. Tallar el viento hacia un lado empuja la nube un puesto, y el copo que toca la piedra o sale del cielo se dispersa. La tarjeta se queda cuando los copos que quedan son justo las casillas marcadas.",
    keys: "Arriba o W es el norte, derecha o D el este, abajo o S el sur, izquierda o A el oeste. V cambia la vista, Esc pausa. Esas direcciones son las del cielo, no las de la cámara, y cambiar la vista deja la nube donde está. La nube inicial es más grande que la marca, así que no se puede conservar entera. La tarjeta se queda en esta pantalla y no se guarda en el aparato.",
    steps: "Pasos",
    seed: "Semilla",
    apply: "Esta semilla",
    next: "Otro cielo",
    acts: "Viento",
    north: "Norte",
    east: "Este",
    south: "Sur",
    west: "Oeste",
    limit: "Ese viento no cambia la nube",
    wait: "Los mandos están retenidos",
    hint: "Empuja la nube un puesto hacia allá. El copo que encuentra la piedra o el borde se dispersa",
    cloudName: "Nube",
    markName: "Marca",
    pause: "Pausa",
    resume: "Seguir",
    view: "Vista",
    mute: "Silenciar",
    sound: "Activar sonido",
    giveUp: "Rendirse",
    paused: "En pausa. Seguir para volver.",
    playing: "Vientos abiertos",
    none: "Ahora no se mueve nada.",
    win: "La nube que quedó es la marca, así que esta tarjeta se quedó.",
    cap: "Pasaron ocho pasos sin formar la marca.",
    resigned: "Dejaste este cielo.",
    scattered: "Toda la nube se dispersó.",
  },
};

type Tick = "nudge" | "block" | "win" | "lose";

interface SkyAudio {
  arm: () => void;
  setBed: (on: boolean) => void;
  tick: (kind: Tick) => void;
  close: () => void;
}

function createSkyAudio(): SkyAudio {
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
        blip(ctx, 180, 0.08, 0.026);
        return;
      }
      if (kind === "block") {
        blip(ctx, 90, 0.05, 0.018);
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

function windClass(dir: Dir, live: boolean): string {
  if (dir === "N" && live) return "col-start-2 row-start-1 min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  if (dir === "N") return "col-start-2 row-start-1 min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
  if (dir === "W" && live) return "col-start-1 row-start-2 min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  if (dir === "W") return "col-start-1 row-start-2 min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
  if (dir === "E" && live) return "col-start-3 row-start-2 min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  if (dir === "E") return "col-start-3 row-start-2 min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
  if (live) return "col-start-2 row-start-3 min-h-11 min-w-11 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40";
  return "col-start-2 row-start-3 min-h-11 min-w-11 rounded-xl bg-muted px-3 text-sm font-semibold text-foreground disabled:opacity-40";
}

function gaugeClass(ready: boolean): string {
  if (ready) return "rounded-xl bg-card px-3 py-2 text-sm text-foreground";
  return "rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground";
}

function label(dir: Dir, copy: Copy): string {
  if (dir === "N") return copy.north;
  if (dir === "E") return copy.east;
  if (dir === "S") return copy.south;
  return copy.west;
}

function shortcut(dir: Dir): string {
  if (dir === "N") return "ArrowUp W";
  if (dir === "E") return "ArrowRight D";
  if (dir === "S") return "ArrowDown S";
  return "ArrowLeft A";
}

function places(cells: readonly number[]): string {
  return cells.map((cell) => String(cell + 1)).join(" · ");
}

function detailFor(state: CloudState, dir: Dir, copy: Copy): string {
  if (state.status !== "play") return copy.wait;
  if (stepCloud(state, dir) === state) return copy.limit;
  return copy.hint;
}

function codeAction(code: string): Dir | null {
  if (code === "ArrowUp" || code === "KeyW") return "N";
  if (code === "ArrowRight" || code === "KeyD") return "E";
  if (code === "ArrowDown" || code === "KeyS") return "S";
  if (code === "ArrowLeft" || code === "KeyA") return "W";
  return null;
}

const PAD: readonly Dir[] = ["N", "W", "E", "S"];

export default function CloudSculptor({ locale = "en" }: { locale?: Locale }) {
  const copy = COPY[locale] ?? COPY.en;
  const reduce = usePrefersReducedMotion();
  const opening = useRef(createCloud(0));
  const [seed, setSeed] = useState(0);
  const [draft, setDraft] = useState("0");
  const [state, setState] = useState<CloudState>(opening.current);
  const [shown, setShown] = useState<CloudState>(opening.current);
  const [glide, setGlide] = useState<CloudGlide | null>(null);
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
  const audio = useRef<SkyAudio | null>(null);
  if (!audio.current) audio.current = createSkyAudio();
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
    const next = createCloud(fromUrl);
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

  const begin = useCallback((next: CloudState, kind: Tick) => {
    arm();
    note(kind);
    glideSerial.current += 1;
    setShown(stateRef.current);
    setState(next);
    setGlide({ id: glideSerial.current });
    setBusy(true);
  }, [arm, note]);

  const move = useCallback((dir: Dir) => {
    const current = stateRef.current;
    if (pausedRef.current || busyRef.current || current.status !== "play") return;
    const next = stepCloud(current, dir);
    if (next === current) {
      arm();
      if (!mutedRef.current && !pausedRef.current) audio.current?.tick("block");
      return;
    }
    const kind: Tick = next.status === "win" ? "win" : next.status === "lose" ? "lose" : "nudge";
    begin(next, kind);
  }, [arm, begin]);

  const load = useCallback((value: number) => {
    const next = createCloud(value);
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
      const dir = codeAction(event.code);
      if (!dir) return;
      event.preventDefault();
      move(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const locked = paused || busy || state.status !== "play";
  const open = new Set(openActions(state));
  const openNames = DIRS.filter((dir) => open.has(dir)).map((dir) => label(dir, copy));
  const matched = state.cells.join(",") === state.target.join(",");
  const outcome = state.loseReason === "scattered"
    ? copy.scattered
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
        <li className={gaugeClass(matched)}>
          {copy.cloudName} {places(state.cells)}
        </li>
        <li className={gaugeClass(matched)}>
          {copy.markName} {places(state.target)}
        </li>
      </ol>
      <p role="status" aria-live="polite" className="text-sm text-foreground">{live}</p>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-96" aria-hidden="true">
          <CloudSculptorScene
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
        <p id="cloud-sculptor-acts" className="text-sm font-semibold text-foreground">{copy.acts}</p>
        <div role="group" aria-labelledby="cloud-sculptor-acts" className="grid grid-cols-3 gap-2">
          {PAD.map((dir) => {
            const available = open.has(dir);
            const detail = detailFor(state, dir, copy);
            return (
              <button
                key={dir}
                type="button"
                className={windClass(dir, available && !locked)}
                aria-keyshortcuts={shortcut(dir)}
                aria-label={`${label(dir, copy)}. ${detail}`}
                disabled={locked || !available}
                onClick={() => move(dir)}
              >
                {label(dir, copy)}
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
