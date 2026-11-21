import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCw, RotateCcw, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { ZEN_MUSICBOX_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import {
  ROOM_COUNT,
  TIDY_SLUG,
  buildRoom,
  createBoard,
  isSolved,
  pickUp,
  placeNear,
  rotatePiece,
  roomStars,
  type Board,
  type Cell,
  type ItemKind,
  type Piece,
} from "../../lib/games/tidy-nook";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  room: string; left: string; moves: string; rotate: string; reset: string; hint: string; done: string; next: string;
  finale: string; rooms: string; full: string; exitFull: string; mute: string; unmute: string; names: string[]; kinds: Record<ItemKind, string>;
}> = {
  ko: {
    room: "{0}번째 방", left: "남은 물건 {0}", moves: "옮긴 횟수 {0}", rotate: "돌리기", reset: "처음부터", hint: "물건을 고르고 선반 칸을 누르세요. 놓은 물건을 누르면 다시 꺼냅니다.",
    done: "말끔히 정리했어요!", next: "다음 방", finale: "20개 방을 모두 정리했어요! 첫 방부터 다시", rooms: "방 고르기",
    full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
    names: ["현관 신발장", "부엌 찬장", "작은 서재", "창가 선반", "욕실 수납장", "다락방", "아이 방 책장", "베란다 화분대", "거실 장식장", "작업실 서랍장"],
    kinds: { mug: "머그잔", plant: "화분", frame: "액자", candle: "초", books: "책", radio: "라디오", kettle: "주전자", lamp: "스탠드", teddy: "곰 인형", yarn: "털실 바구니", box: "상자", rug: "말아 둔 러그" },
  },
  en: {
    room: "Room {0}", left: "{0} items left", moves: "Moves {0}", rotate: "Rotate", reset: "Start over", hint: "Pick an item, then tap a shelf cell. Tap a placed item to take it back.",
    done: "All tidy!", next: "Next room", finale: "All 20 rooms tidied! Start again from room 1", rooms: "Pick a room",
    full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Sound on",
    names: ["Hallway shoe rack", "Kitchen cupboard", "Little study", "Window shelf", "Bathroom cabinet", "Attic", "Kids' bookcase", "Balcony plant stand", "Living-room cabinet", "Workshop drawers"],
    kinds: { mug: "Mug", plant: "Plant", frame: "Frame", candle: "Candle", books: "Books", radio: "Radio", kettle: "Kettle", lamp: "Lamp", teddy: "Teddy", yarn: "Yarn basket", box: "Box", rug: "Rolled rug" },
  },
  ja: {
    room: "{0}番目の部屋", left: "残り{0}個", moves: "移動 {0}", rotate: "回す", reset: "最初から", hint: "物を選んで棚のマスを押します。置いた物を押すと取り出せます。",
    done: "すっきり片付きました！", next: "次の部屋", finale: "20部屋すべて片付きました！最初の部屋から", rooms: "部屋を選ぶ",
    full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音をオン",
    names: ["玄関の靴箱", "台所の戸棚", "小さな書斎", "窓辺の棚", "洗面所の収納", "屋根裏", "子ども部屋の本棚", "ベランダの花台", "居間の飾り棚", "作業部屋の引き出し"],
    kinds: { mug: "マグ", plant: "鉢植え", frame: "額縁", candle: "ろうそく", books: "本", radio: "ラジオ", kettle: "やかん", lamp: "スタンド", teddy: "くま", yarn: "毛糸かご", box: "箱", rug: "巻いたラグ" },
  },
  zh: {
    room: "第{0}个房间", left: "还剩{0}件", moves: "移动 {0}", rotate: "旋转", reset: "重来", hint: "选一件物品，再点架子上的格子。点已放好的物品可以拿回来。",
    done: "收拾得干干净净！", next: "下一个房间", finale: "20个房间全部整理好了！从第一个重新开始", rooms: "选择房间",
    full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
    names: ["玄关鞋柜", "厨房橱柜", "小书房", "窗边架子", "浴室收纳柜", "阁楼", "儿童书架", "阳台花架", "客厅装饰柜", "工作间抽屉柜"],
    kinds: { mug: "马克杯", plant: "盆栽", frame: "相框", candle: "蜡烛", books: "书", radio: "收音机", kettle: "水壶", lamp: "台灯", teddy: "小熊", yarn: "毛线篮", box: "箱子", rug: "卷起的地毯" },
  },
  fr: {
    room: "Pièce {0}", left: "{0} objets restants", moves: "Coups {0}", rotate: "Tourner", reset: "Recommencer", hint: "Choisissez un objet puis touchez une case de l'étagère. Touchez un objet posé pour le reprendre.",
    done: "Tout est rangé !", next: "Pièce suivante", finale: "Les 20 pièces rangées ! Recommencer à la première", rooms: "Choisir une pièce",
    full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
    names: ["Meuble à chaussures", "Placard de cuisine", "Petit bureau", "Étagère de fenêtre", "Armoire de salle de bain", "Grenier", "Bibliothèque d'enfant", "Étagère du balcon", "Vitrine du salon", "Tiroirs de l'atelier"],
    kinds: { mug: "Tasse", plant: "Plante", frame: "Cadre", candle: "Bougie", books: "Livres", radio: "Radio", kettle: "Bouilloire", lamp: "Lampe", teddy: "Ourson", yarn: "Panier de laine", box: "Boîte", rug: "Tapis roulé" },
  },
  es: {
    room: "Habitación {0}", left: "Quedan {0}", moves: "Movimientos {0}", rotate: "Girar", reset: "Empezar de nuevo", hint: "Elige un objeto y toca una casilla del estante. Toca un objeto colocado para recogerlo.",
    done: "¡Todo ordenado!", next: "Siguiente habitación", finale: "¡Las 20 habitaciones ordenadas! Empezar por la primera", rooms: "Elegir habitación",
    full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
    names: ["Zapatero del recibidor", "Armario de cocina", "Pequeño estudio", "Estante de la ventana", "Mueble del baño", "Desván", "Estantería infantil", "Repisa del balcón", "Vitrina del salón", "Cajonera del taller"],
    kinds: { mug: "Taza", plant: "Planta", frame: "Marco", candle: "Vela", books: "Libros", radio: "Radio", kettle: "Tetera", lamp: "Lámpara", teddy: "Osito", yarn: "Cesta de lana", box: "Caja", rug: "Alfombra enrollada" },
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:tidy-nook:muted";
const CELL = 64;
const PAD = 24;

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

/** Draws one item over its cells: a soft body plus a small picture of what it is. */
function drawItem(ctx: CanvasRenderingContext2D, kind: ItemKind, color: string, cells: readonly Cell[], ox: number, oy: number, size: number, ghost = false): void {
  ctx.globalAlpha = ghost ? 0.45 : 1;
  for (const [x, y] of cells) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(ox + x * size + 3, oy + y * size + 3, size - 6, size - 6, size * 0.18);
    ctx.fill();
    ctx.fillStyle = shade(color, 28);
    ctx.fillRect(ox + x * size + 8, oy + y * size + 7, size - 16, 4);
  }
  // Join neighbouring cells so the item reads as one object.
  ctx.fillStyle = color;
  for (const [x, y] of cells) {
    if (cells.some((c) => c[0] === x + 1 && c[1] === y)) ctx.fillRect(ox + x * size + size - 6, oy + y * size + 8, 12, size - 16);
    if (cells.some((c) => c[0] === x && c[1] === y + 1)) ctx.fillRect(ox + x * size + 8, oy + y * size + size - 6, size - 16, 12);
  }
  const cx = ox + (cells.reduce((a, c) => a + c[0], 0) / cells.length + 0.5) * size;
  const cy = oy + (cells.reduce((a, c) => a + c[1], 0) / cells.length + 0.5) * size;
  const s = size * 0.32;
  ctx.fillStyle = "rgba(40,30,25,0.75)";
  ctx.strokeStyle = "rgba(40,30,25,0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  switch (kind) {
    case "mug":
      ctx.roundRect(cx - s * 0.6, cy - s * 0.5, s, s * 1.1, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + s * 0.5, cy, s * 0.3, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      break;
    case "plant":
      ctx.fillRect(cx - s * 0.45, cy, s * 0.9, s * 0.7);
      ctx.fillStyle = "#2d6a4f";
      for (const a of [-0.8, 0, 0.8]) {
        ctx.beginPath();
        ctx.ellipse(cx + a * s * 0.5, cy - s * 0.3, s * 0.22, s * 0.5, a, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "frame":
      ctx.strokeRect(cx - s * 0.6, cy - s * 0.6, s * 1.2, s * 1.2);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy + s * 0.4);
      ctx.lineTo(cx, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.5, cy + s * 0.4);
      ctx.stroke();
      break;
    case "candle":
      ctx.fillRect(cx - s * 0.2, cy - s * 0.2, s * 0.4, s * 0.9);
      ctx.fillStyle = "#ffb703";
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.45, s * 0.14, s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "books":
      for (let i = -1; i <= 1; i++) ctx.fillRect(cx + i * s * 0.45 - s * 0.15, cy - s * 0.7, s * 0.3, s * 1.4);
      break;
    case "radio":
      ctx.roundRect(cx - s, cy - s * 0.5, s * 2, s, 6);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx - s * 0.45, cy, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "kettle":
      ctx.arc(cx, cy + s * 0.1, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.4, s * 0.45, Math.PI, 0);
      ctx.stroke();
      break;
    case "lamp":
      ctx.moveTo(cx - s * 0.7, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.7, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.35, cy - s * 0.8);
      ctx.lineTo(cx - s * 0.35, cy - s * 0.8);
      ctx.fill();
      ctx.fillRect(cx - 2, cy - s * 0.1, 4, s * 0.8);
      break;
    case "teddy":
      ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2);
      ctx.arc(cx - s * 0.5, cy - s * 0.55, s * 0.22, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.5, cy - s * 0.55, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "yarn":
      ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "box":
      ctx.strokeRect(cx - s, cy - s * 0.7, s * 2, s * 1.4);
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.lineTo(cx, cy + s * 0.7);
      ctx.stroke();
      break;
    case "rug":
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * s * 0.7, cy, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
  }
  ctx.globalAlpha = 1;
}

function TrayPreview({ piece, cells }: { piece: Piece; cells: readonly Cell[] }) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  return (
    <svg viewBox={`0 0 ${w * 10} ${h * 10}`} className="h-10 w-auto max-w-16" aria-hidden="true">
      {cells.map(([x, y]) => (
        <rect key={`${x},${y}`} x={x * 10 + 0.5} y={y * 10 + 0.5} width={9} height={9} rx={2} fill={piece.color} />
      ))}
    </svg>
  );
}

export default function TidyNook({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [index, setIndex] = useState(0);
  const room = useMemo(() => buildRoom(index), [index]);
  const [board, setBoard] = useState<Board>(() => createBoard(buildRoom(0)));
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);

  const solved = isSolved(board);
  useRunRecord(TIDY_SLUG, solved, roomStars(board) * 100 + room.pieces.length * 10);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const load = useCallback((i: number) => {
    setIndex(i);
    setBoard(createBoard(buildRoom(i)));
    setSelected(null);
  }, []);

  useEffect(() => {
    const done = loadClearedStages(TIDY_SLUG, ROOM_COUNT);
    setCleared(done);
    load(nextOpenStage(done, ROOM_COUNT));
    const m = readMutedPref(MUTE_KEY);
    setMuted(m);
    cues.current = createCuePlayer({ cues: ZEN_MUSICBOX_CUES, muted: m });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [load]);

  const width = PAD * 2 + room.w * CELL;
  const height = PAD * 2 + room.h * CELL + 40;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    // warm wallpaper with little dots
    ctx.fillStyle = "#fbf1e6";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#f3dcc6";
    for (let y = 8; y < height; y += 22) for (let x = (y / 22) % 2 ? 8 : 19; x < width; x += 22) ctx.fillRect(x, y, 3, 3);
    // shelf frame
    ctx.fillStyle = "#a47148";
    ctx.beginPath();
    ctx.roundRect(PAD - 12, PAD - 12, room.w * CELL + 24, room.h * CELL + 24, 12);
    ctx.fill();
    ctx.fillStyle = "#e9d5b7";
    ctx.fillRect(PAD, PAD, room.w * CELL, room.h * CELL);
    ctx.strokeStyle = "#c9a77c";
    ctx.lineWidth = 2;
    for (let y = 0; y <= room.h; y++) {
      ctx.fillStyle = "#b5835a";
      ctx.fillRect(PAD, PAD + y * CELL - 3, room.w * CELL, 6);
    }
    for (let x = 1; x < room.w; x++) {
      ctx.beginPath();
      ctx.moveTo(PAD + x * CELL, PAD);
      ctx.lineTo(PAD + x * CELL, PAD + room.h * CELL);
      ctx.stroke();
    }
    // fixed decor
    for (const [x, y] of room.blocked) {
      ctx.fillStyle = "#8d99ae";
      ctx.beginPath();
      ctx.roundRect(PAD + x * CELL + 10, PAD + y * CELL + 10, CELL - 20, CELL - 20, 8);
      ctx.fill();
      ctx.fillStyle = "#edf2f4";
      ctx.beginPath();
      ctx.arc(PAD + x * CELL + CELL / 2, PAD + y * CELL + CELL / 2, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of room.pieces) {
      const cells = board.placed[p.id];
      if (cells) drawItem(ctx, p.kind, p.color, cells, PAD, PAD, CELL);
    }
    // ghost preview under the pointer
    if (selected !== null && hover && !board.placed[selected]) {
      const preview = placeNear(board, selected, hover[0], hover[1]);
      const cells = preview.placed[selected];
      const piece = room.pieces.find((p) => p.id === selected);
      if (cells && piece) drawItem(ctx, piece.kind, piece.color, cells, PAD, PAD, CELL, true);
    }
    // floor
    ctx.fillStyle = "#c89f7a";
    ctx.fillRect(0, height - 28, width, 28);
    if (solved) {
      ctx.fillStyle = "rgba(255,214,102,0.25)";
      ctx.fillRect(0, 0, width, height);
    }
  }, [board, room, selected, hover, width, height, solved]);

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>): Cell | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((((e.clientX - rect.left) / rect.width) * width - PAD) / CELL);
    const y = Math.floor((((e.clientY - rect.top) / rect.height) * height - PAD) / CELL);
    return x >= 0 && y >= 0 && x < room.w && y < room.h ? [x, y] : null;
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(e);
    if (!cell || solved) return;
    if (selected !== null && !board.placed[selected]) {
      const next = placeNear(board, selected, cell[0], cell[1]);
      if (next !== board) {
        setBoard(next);
        sfx(isSolved(next) ? "win" : "place");
        if (isSolved(next)) setCleared(markStageCleared(TIDY_SLUG, index, ROOM_COUNT));
        const nextFree = room.pieces.find((p) => !next.placed[p.id]);
        setSelected(nextFree ? nextFree.id : null);
        return;
      }
    }
    const up = pickUp(board, cell[0], cell[1]);
    if (up.id !== null) {
      setBoard(up.board);
      setSelected(up.id);
      sfx("tap");
    } else if (selected !== null) sfx("fail");
  };

  const rotateSelected = () => {
    if (selected === null) return;
    setBoard((b) => rotatePiece(b, selected));
    sfx("tap");
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    cues.current?.setMuted(next);
    writeMutedPref(MUTE_KEY, next);
  };

  const tray = room.pieces.filter((p) => !board.placed[p.id]);
  const stars = roomStars(board);

  return (
    <div
      ref={containerRef}
      data-game="tidy-nook"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-3 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-2xl space-y-3"}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{fill(c.room, index + 1)} / {ROOM_COUNT}</Badge>
        <Badge variant="outline">{c.names[index % c.names.length]}</Badge>
        <Badge variant="outline">{fill(c.left, tray.length)}</Badge>
        <Badge variant="outline">{fill(c.moves, board.moves)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={onDown}
        onPointerMove={(e) => setHover(cellAt(e))}
        onPointerLeave={() => setHover(null)}
        className="mx-auto block w-full max-w-xl touch-none select-none rounded-xl border border-border"
        aria-label={c.hint}
      />

      {solved ? (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
          <p className="text-lg font-bold">{c.done}</p>
          <p className="text-xl text-warning" aria-label={`${stars}/3`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>{c.reset}</Button>
            <Button className="min-h-12" onClick={() => load(index >= ROOM_COUNT - 1 ? 0 : index + 1)}>{index >= ROOM_COUNT - 1 ? c.finale : c.next}</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{c.hint}</p>
          <div className="flex flex-wrap gap-2" role="listbox" aria-label={fill(c.left, tray.length)}>
            {tray.map((p) => (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={selected === p.id}
                aria-label={c.kinds[p.kind]}
                onClick={() => { setSelected(p.id); sfx("tap"); }}
                className={`flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-lg border-2 bg-card p-1.5 ${selected === p.id ? "border-primary" : "border-border"}`}
              >
                <TrayPreview piece={p} cells={board.rotation[p.id]} />
                <span className="text-xs text-muted-foreground">{c.kinds[p.kind]}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="min-h-12" disabled={selected === null} onClick={rotateSelected}>
              <RotateCw className="size-4" />
              {c.rotate}
            </Button>
            <Button variant="outline" className="min-h-12" onClick={() => load(index)}>
              <RotateCcw className="size-4" />
              {c.reset}
            </Button>
          </div>
        </>
      )}

      <details className="rounded-lg border border-border p-2">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">{c.rooms}</summary>
        <div className="pt-2">
          <StageBar count={ROOM_COUNT} current={index} cleared={cleared} locale={locale} onSelect={load} />
        </div>
      </details>
    </div>
  );
}
