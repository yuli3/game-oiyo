import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Circle, Lightbulb, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawSprite, type PixelArt } from "../../lib/games/pixel-kit";
import { SEBAE_SLUG, STAGE_COUNT, clueStatus, hint, isSolved, positions, puzzle, starsFor, type Clue } from "../../lib/games/sebae-line";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";
const W = 360;
const H = 400;
const SLOT_Y = 236;
const WAIT_Y = 352;

type Templates = Record<Clue["kind"], string>;

const COPY: Record<L, {
  stage: string; people: string; moves: string; clues: string; solved: string; again: string; next: string; hint: string; hinted: string;
  help: string; stages: string; mute: string; unmute: string; names: string[]; t: Templates; reset: string; spot: string;
}> = {
  ko: {
    stage: "{0}단계", people: "{0}명", moves: "{0}번 옮김", clues: "단서", solved: "세배 준비 끝! 새해 복 많이 받으세요", again: "다시 하기", next: "다음 단계",
    hint: "힌트", hinted: "힌트를 쓰면 별이 최대 2개예요", reset: "모두 내리기", spot: "{0}번",
    help: "가족들이 세배하려고 한 줄로 섭니다. 단서를 읽고 사람을 끌어서 자리에 놓으세요. 왼쪽·오른쪽은 화면에서 보는 방향이고, 자리 번호는 왼쪽부터 1번입니다. 답은 하나뿐이에요.",
    stages: "단계 고르기", mute: "소리 끄기", unmute: "소리 켜기",
    names: ["할아버지", "할머니", "아빠", "엄마", "삼촌", "고모", "누나", "막내"],
    t: {
      pos: "{A}{은} {k}번 자리에 서요.", notPos: "{A}{은} {k}번 자리가 아니에요.", end: "{A}{은} 줄의 양쪽 끝 중 한 곳에 서요.", notEnd: "{A}{은} 양쪽 끝이 아니에요.",
      left: "{A}{은} {B}보다 왼쪽 어딘가에 있어요.", adj: "{A}{와} {B}{은} 바로 옆에 붙어 서요.", notAdj: "{A}{와} {B}{은} 붙어 서지 않아요.",
      dirLeft: "{A}{은} {B}의 바로 왼쪽이에요.", gap1: "{A}{와} {B} 사이에는 딱 한 명이 있어요.", between: "{A}{은} {B}{와} {C} 사이 어딘가에 있어요.",
    },
  },
  en: {
    stage: "Stage {0}", people: "{0} people", moves: "{0} moves", clues: "Clues", solved: "Ready to bow! Happy New Year", again: "Play again", next: "Next stage",
    hint: "Hint", hinted: "Using a hint caps this stage at 2 stars", reset: "Clear all", spot: "#{0}",
    help: "The family lines up in a row for the New Year's bow. Read the clues and drag each person into a spot. Left and right are as you look at the screen, and spots are numbered from 1 on the left. There is exactly one answer.",
    stages: "Pick a stage", mute: "Mute", unmute: "Sound on",
    names: ["Grandpa", "Grandma", "Dad", "Mom", "Uncle", "Auntie", "Lily", "Max"],
    t: {
      pos: "{A} stands in spot {k}.", notPos: "{A} is not in spot {k}.", end: "{A} stands at one end of the line.", notEnd: "{A} is not at either end.",
      left: "{A} is somewhere left of {B}.", adj: "{A} and {B} stand side by side.", notAdj: "{A} and {B} are not side by side.",
      dirLeft: "{A} is directly to the left of {B}.", gap1: "Exactly one person stands between {A} and {B}.", between: "{A} is somewhere between {B} and {C}.",
    },
  },
  ja: {
    stage: "{0}面", people: "{0}人", moves: "{0}回移動", clues: "ヒントの言葉", solved: "セベの準備完了！明けましておめでとう", again: "もう一度", next: "次の面",
    hint: "ヒント", hinted: "ヒントを使うと星は最大2つです", reset: "全部おろす", spot: "{0}番",
    help: "家族が新年のあいさつ（セベ）のために一列に並びます。手がかりを読んで、人をドラッグして場所に置きましょう。左右は画面で見た向きで、場所は左から1番です。答えはひとつだけ。",
    stages: "ステージを選ぶ", mute: "ミュート", unmute: "音をオン",
    names: ["おじいちゃん", "おばあちゃん", "パパ", "ママ", "おじさん", "おばさん", "お姉ちゃん", "弟"],
    t: {
      pos: "{A}は{k}番。", notPos: "{A}は{k}番ではない。", end: "{A}は列のどちらかの端。", notEnd: "{A}は両端ではない。",
      left: "{A}は{B}より左のどこか。", adj: "{A}と{B}は隣どうし。", notAdj: "{A}と{B}は隣どうしではない。",
      dirLeft: "{A}は{B}のすぐ左。", gap1: "{A}と{B}の間にはちょうど1人。", between: "{A}は{B}と{C}の間のどこか。",
    },
  },
  zh: {
    stage: "第{0}关", people: "{0}人", moves: "移动{0}次", clues: "线索", solved: "拜年准备好了！新年快乐", again: "再玩一次", next: "下一关",
    hint: "提示", hinted: "使用提示后本关最多2颗星", reset: "全部撤下", spot: "{0}号",
    help: "一家人排成一排准备拜年。读线索，把每个人拖到位置上。左右以屏幕上看到的方向为准，位置从左边开始是1号。答案只有一个。",
    stages: "选择关卡", mute: "静音", unmute: "开启声音",
    names: ["爷爷", "奶奶", "爸爸", "妈妈", "叔叔", "姑姑", "姐姐", "弟弟"],
    t: {
      pos: "{A}站在{k}号位置。", notPos: "{A}不在{k}号位置。", end: "{A}站在队伍的一端。", notEnd: "{A}不在两端。",
      left: "{A}在{B}左边的某处。", adj: "{A}和{B}紧挨着。", notAdj: "{A}和{B}不挨着。",
      dirLeft: "{A}紧挨在{B}的左边。", gap1: "{A}和{B}之间正好隔着一个人。", between: "{A}在{B}和{C}之间的某处。",
    },
  },
  fr: {
    stage: "Niveau {0}", people: "{0} personnes", moves: "{0} déplacements", clues: "Indices", solved: "Prêts pour le salut ! Bonne année", again: "Rejouer", next: "Niveau suivant",
    hint: "Indice", hinted: "Avec un indice, ce niveau rapporte 2 étoiles au plus", reset: "Tout retirer", spot: "n° {0}",
    help: "La famille se met en rang pour le salut du Nouvel An. Lisez les indices et faites glisser chaque personne à sa place. Gauche et droite sont vues depuis l'écran, et les places sont numérotées à partir de 1 à gauche. Il n'y a qu'une seule solution.",
    stages: "Choisir un niveau", mute: "Couper le son", unmute: "Activer le son",
    names: ["Papi", "Mamie", "Papa", "Maman", "Tonton", "Tata", "Léa", "Tom"],
    t: {
      pos: "{A} est à la place {k}.", notPos: "{A} n'est pas à la place {k}.", end: "{A} est à un bout du rang.", notEnd: "{A} n'est à aucun des deux bouts.",
      left: "{A} est quelque part à gauche de {B}.", adj: "{A} et {B} sont côte à côte.", notAdj: "{A} et {B} ne sont pas côte à côte.",
      dirLeft: "{A} est juste à gauche de {B}.", gap1: "Il y a exactement une personne entre {A} et {B}.", between: "{A} est quelque part entre {B} et {C}.",
    },
  },
  es: {
    stage: "Nivel {0}", people: "{0} personas", moves: "{0} movimientos", clues: "Pistas", solved: "¡Listos para la reverencia! Feliz año", again: "Otra vez", next: "Siguiente nivel",
    hint: "Pista", hinted: "Con una pista, este nivel da 2 estrellas como máximo", reset: "Quitar todos", spot: "n.º {0}",
    help: "La familia se pone en fila para la reverencia de Año Nuevo. Lee las pistas y arrastra a cada persona a su puesto. Izquierda y derecha son como se ve en la pantalla, y los puestos se numeran desde el 1 a la izquierda. Solo hay una solución.",
    stages: "Elegir nivel", mute: "Silenciar", unmute: "Activar sonido",
    names: ["Abuelo", "Abuela", "Papá", "Mamá", "Tío", "Tía", "Lucía", "Pablo"],
    t: {
      pos: "{A} está en el puesto {k}.", notPos: "{A} no está en el puesto {k}.", end: "{A} está en uno de los extremos.", notEnd: "{A} no está en ningún extremo.",
      left: "{A} está en algún lugar a la izquierda de {B}.", adj: "{A} y {B} están juntos.", notAdj: "{A} y {B} no están juntos.",
      dirLeft: "{A} está justo a la izquierda de {B}.", gap1: "Hay exactamente una persona entre {A} y {B}.", between: "{A} está en algún lugar entre {B} y {C}.",
    },
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

/** Korean particles that depend on whether the word ends in a consonant. */
function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function clueText(c: Clue, copy: (typeof COPY)[L], locale: L): string {
  const names = copy.names;
  const words: Record<string, string> = { A: names[c.a] };
  if ("b" in c) words.B = names[c.b];
  if ("c" in c) words.C = names[c.c];
  if ("k" in c) words.k = String(c.k + 1);
  let text = copy.t[c.kind];
  if (locale === "ko") {
    text = text.replace(/\{([ABC])\}\{(은|와)\}/g, (_, key: string, particle: string) => {
      const w = words[key];
      const b = hasBatchim(w);
      return w + (particle === "은" ? (b ? "은" : "는") : b ? "과" : "와");
    });
  }
  return text.replace(/\{(A|B|C|k)\}/g, (_, key: string) => words[key] ?? "");
}

const MUTE_KEY = "oiyo:sebae-line:muted";

function person(hair: string, robe: string, trim: string, extra: "beard" | "bun" | "glasses" | "tails" | "none", small = false): PixelArt {
  const palette = { k: hair, s: "#f3c9a0", e: "#1f1410", r: robe, t: trim, w: "#ffffff", p: "#f28b9b", g: "#495057", b: "#e9ecef" };
  const head = [
    extra === "bun" ? "...kkk...." : extra === "tails" ? ".k.kkkk.k." : "..........",
    "..kkkkkk..",
    extra === "tails" ? "kkkkkkkkkk" : ".kkkkkkkk.",
    ".kssssssk.",
    extra === "glasses" ? ".gegsgeg.." : ".sesssess.",
    ".psssssp..",
    extra === "beard" ? "..bbbbbb.." : "..ssssss..",
  ];
  const body = small
    ? ["..rrrrrr..", ".srrttrrs.", "..rrrrrr..", "..rrrrrr..", "...e..e..."]
    : ["..rrrrrr..", ".rrrttrrr.", "srrrttrrrs", ".rrrrrrrr.", ".rrrrrrrr.", "rrrrrrrrrr", "..e....e.."];
  return { palette, rows: [...head, ...body] };
}

const FAMILY_ART: PixelArt[] = [
  person("#dee2e6", "#f8f9fa", "#495057", "beard"),
  person("#ced4da", "#c2255c", "#ffd43b", "bun"),
  person("#2b1d16", "#1c7ed6", "#e7f5ff", "none"),
  person("#3b2a20", "#f783ac", "#2f9e44", "bun"),
  person("#2b1d16", "#5f3dc4", "#ffe066", "glasses"),
  person("#4a2e1c", "#f08c00", "#fff3bf", "none"),
  person("#2b1d16", "#e64980", "#ffec99", "tails", true),
  person("#2b1d16", "#2f9e44", "#ff922b", "none", true),
];

const SCREEN_COLORS = ["#2b8a3e", "#c92a2a", "#1864ab", "#e67700"];

interface Drag { person: number; from: number; x: number; y: number; dx: number; dy: number }

export default function SebaeLine({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;

  const [stage, setStage] = useState(0);
  const [slots, setSlots] = useState<Array<number | null>>([]);
  const [moves, setMoves] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [solved, setSolved] = useState(false);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const pz = useMemo(() => puzzle(stage), [stage]);
  const size = pz.size;
  const slotW = W / size;
  const placed = useMemo(() => positions(slots), [slots]);
  const waiting = pz.people.filter((p) => !placed.has(p));
  const stars = solved ? Math.min(starsFor(moves, size), hinted ? 2 : 3) : 0;

  useRunRecord(SEBAE_SLUG, solved, moves, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    setSlots(new Array(puzzle(s).size).fill(null));
    setMoves(0);
    setHinted(false);
    setSolved(false);
    setDrag(null);
    setFlash(null);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(SEBAE_SLUG, STAGE_COUNT);
    setCleared(done);
    start(nextOpenStage(done, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  const slotX = useCallback((i: number) => slotW * i + slotW / 2, [slotW]);
  const waitX = useCallback((i: number, n: number) => (W / Math.max(n, 1)) * i + W / Math.max(n, 1) / 2, []);

  // draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    // room: warm wall, folding screen, floor
    ctx.fillStyle = "#f4e3c3";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8d2a8";
    for (let y = 0; y < 170; y += 24) ctx.fillRect(0, y, W, 2);
    const panels = 6;
    const pw = (W - 40) / panels;
    for (let k = 0; k < panels; k++) {
      const x = 20 + k * pw;
      ctx.fillStyle = "#5c3a21";
      ctx.fillRect(Math.round(x), 30, Math.round(pw), 150);
      ctx.fillStyle = "#fff8e7";
      ctx.fillRect(Math.round(x) + 4, 36, Math.round(pw) - 8, 138);
      ctx.fillStyle = SCREEN_COLORS[k % SCREEN_COLORS.length];
      // simple flower and stem in each panel
      const cx = Math.round(x + pw / 2);
      ctx.fillRect(cx - 1, 110, 2, 50);
      ctx.fillRect(cx - 6, 100, 12, 12);
      ctx.fillStyle = "#ffd43b";
      ctx.fillRect(cx - 2, 104, 4, 4);
      ctx.fillStyle = "#2b8a3e";
      ctx.fillRect(cx + 1, 132, 8, 4);
      ctx.fillRect(cx - 9, 144, 8, 4);
    }
    ctx.fillStyle = "#c89b5c";
    ctx.fillRect(0, 196, W, H - 196);
    ctx.fillStyle = "#b5854a";
    for (let y = 204; y < H; y += 14) ctx.fillRect(0, y, W, 2);
    // bowing mats (slots)
    for (let i = 0; i < size; i++) {
      const x = Math.round(slotW * i + 3);
      const w = Math.round(slotW - 6);
      ctx.fillStyle = flash === i ? "#ffd43b" : "#9c2c2c";
      ctx.fillRect(x, SLOT_Y + 2, w, 16);
      ctx.fillStyle = "#e9b949";
      ctx.fillRect(x + 2, SLOT_Y + 4, w - 4, 2);
      ctx.fillStyle = "#3b2a20";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), slotX(i), SLOT_Y + 34);
    }
    // waiting area cushion
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(6, WAIT_Y - 58, W - 12, 64);
    const scale = size >= 8 ? 2 : 3;
    const label = (name: string, x: number, y: number) => {
      ctx.font = `bold ${size >= 7 ? 10 : 11}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const w = ctx.measureText(name).width + 6;
      ctx.fillRect(Math.round(x - w / 2), y - 10, Math.round(w), 13);
      ctx.fillStyle = "#212529";
      ctx.fillText(name, x, y);
    };
    slots.forEach((p, i) => {
      if (p === null || (drag && drag.person === p)) return;
      drawSprite(ctx, FAMILY_ART[p], slotX(i), SLOT_Y - 8 * scale, { scale });
      label(c.names[p], slotX(i), SLOT_Y - 18 * scale);
    });
    waiting.forEach((p, i) => {
      if (drag && drag.person === p) return;
      const x = waitX(i, waiting.length);
      drawSprite(ctx, FAMILY_ART[p], x, WAIT_Y - 8 * scale - 6, { scale });
      label(c.names[p], x, WAIT_Y + 4);
    });
    if (drag) {
      drawSprite(ctx, FAMILY_ART[drag.person], drag.x, drag.y, { scale: scale + 1 });
      label(c.names[drag.person], drag.x, drag.y - 10 * (scale + 1));
    }
  }, [slots, drag, size, slotW, slotX, waitX, waiting, c, flash]);

  const toField = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const pick = (x: number, y: number): { person: number; from: number } | null => {
    if (y > SLOT_Y - 70 && y < SLOT_Y + 40) {
      const i = Math.floor(x / slotW);
      const p = slots[i];
      if (p !== null && p !== undefined) return { person: p, from: i };
    }
    if (y > WAIT_Y - 70 && y < WAIT_Y + 20 && waiting.length) {
      const i = Math.floor(x / (W / waiting.length));
      const p = waiting[Math.max(0, Math.min(waiting.length - 1, i))];
      return { person: p, from: -1 };
    }
    return null;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (solved) return;
    const p = toField(e);
    const hit = pick(p.x, p.y);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ ...hit, x: p.x, y: p.y - 20, dx: 0, dy: 0 });
    sfx("tap");
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const p = toField(e);
    setDrag({ ...drag, x: p.x, y: p.y - 20 });
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const p = toField(e);
    const next = slots.slice();
    const target = p.y > SLOT_Y - 90 && p.y < SLOT_Y + 50 ? Math.max(0, Math.min(size - 1, Math.floor(p.x / slotW))) : -1;
    if (target === drag.from) {
      setDrag(null);
      return;
    }
    if (drag.from >= 0) next[drag.from] = null;
    if (target >= 0) {
      const occupant = next[target];
      next[target] = drag.person;
      if (occupant !== null && drag.from >= 0) next[drag.from] = occupant;
    }
    setDrag(null);
    setSlots(next);
    setMoves((m) => m + 1);
    if (target >= 0) {
      if (isSolved(pz, next)) {
        setSolved(true);
        setCleared(markStageCleared(SEBAE_SLUG, stage, STAGE_COUNT));
        sfx("win");
      } else sfx("place");
    }
  };

  const applyHint = () => {
    const h = hint(pz, slots);
    if (!h || solved) return;
    setHinted(true);
    const next = slots.slice();
    const was = next.indexOf(h.person);
    // swap with whoever stands there; someone coming from the waiting row just bumps them off
    if (was >= 0) next[was] = next[h.spot];
    next[h.spot] = h.person;
    setSlots(next);
    setMoves((m) => m + 1);
    setFlash(h.spot);
    window.setTimeout(() => setFlash(null), 700);
    if (isSolved(pz, next)) {
      setSolved(true);
      setCleared(markStageCleared(SEBAE_SLUG, stage, STAGE_COUNT));
      sfx("win");
    } else sfx("success");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  return (
    <div data-game="sebae-line" className="mx-auto w-full max-w-md space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.people, size)}</Badge>
        <Badge variant="outline">{fill(c.moves, moves)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setDrag(null)}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {solved ? (
          <div className="absolute inset-x-4 top-6 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-base font-bold">{c.solved}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.next}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <section className="rounded-lg border border-border p-2" aria-label={c.clues}>
        <h2 className="pb-1 text-sm font-bold">{c.clues}</h2>
        <ul className="space-y-1">
          {pz.clues.map((clue, i) => {
            const st = clueStatus(clue, placed, size);
            return (
              <li key={i} className="flex items-start gap-2 text-sm leading-snug">
                {st === "ok" ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> : st === "bad" ? <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                <span className={st === "bad" ? "text-destructive" : undefined}>{clueText(clue, c, locale)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold" onClick={applyHint} disabled={solved}>
          <Lightbulb className="size-4" />
          <span>{c.hint}</span>
        </button>
        <button type="button" className="game-btn flex min-h-11 items-center justify-center gap-1 text-sm font-bold" onClick={() => setSlots(new Array(size).fill(null))} disabled={solved}>
          <RotateCcw className="size-4" />
          <span>{c.reset}</span>
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{c.hinted}</p>
      <p className="text-xs text-muted-foreground">{c.help}</p>

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.stages}</summary>
        <div className="pt-2">
          <StageBar count={STAGE_COUNT} current={stage} cleared={cleared} locale={locale} onSelect={(i) => start(i)} />
        </div>
      </details>
    </div>
  );
}
