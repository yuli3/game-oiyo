import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Maximize2, Minimize2, RotateCcw, Undo2, Volume2, VolumeX } from "lucide-react";
import StageBar from "./StageBar";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useArcadePortal } from "../../lib/games/arcade-portal";
import { RETRO_8BIT_CUES, createCuePlayer, readMutedPref, writeMutedPref, type CoreCue, type CuePlayer } from "../../lib/games/game-audio";
import { createHaptics, readHapticsEnabled, type Haptics } from "../../lib/games/haptics";
import { useRunRecord } from "../../lib/games/use-run-record";
import { finaleLabel, loadClearedStages, markStageCleared, nextOpenStage } from "../../lib/games/stage-progress";
import { normalizeGameLocale } from "../../lib/games/game-text";
import { drawParticles, drawSprite, spawnBurst, stepParticles, type PixelArt, type PixelParticle } from "../../lib/games/pixel-kit";
import { STAGE_COUNT, VILLAGE_SLUG, VILLAGE_STAGES, canPlace, newVillage, piece, pieceScore, place, score, starsFor, undo, type Piece, type Village } from "../../lib/games/palm-village";
import type { Locale } from "../../lib/i18n";

type L = "ko" | "en" | "ja" | "zh" | "fr" | "es";

const COPY: Record<L, {
  stage: string; cosy: string; goal: string; next: string; start: string; done: string; result: string; again: string; nextStage: string; undo: string; photo: string;
  pieces: Record<Piece, string>; help: string; stages: string; full: string; exitFull: string; mute: string; unmute: string;
}> = {
  ko: {
    stage: "{0}단계", cosy: "아늑함 {0}", goal: "★★ {0} · ★★★ {1}", next: "다음: {0}", start: "빈 땅을 눌러 조각을 놓아요. 실패는 없어요!", done: "마을 완성!", result: "아늑함 {0}점", again: "다시 짓기", nextStage: "다음 단계", undo: "하나 무르기", photo: "사진 저장",
    pieces: { house: "집", tree: "나무", well: "우물", field: "밭", lantern: "등불" },
    help: "손바닥만 한 작은 섬이에요. 배가 마을 조각을 하나씩 실어 와요. 집, 나무, 우물, 밭, 등불을 원하는 빈 땅에 내려놓으면 돼요. 실패는 없어요. 어떻게 놓아도 마을은 마을이에요. 다만 잘 어울리게 놓으면 마을 사람들이 더 행복해요. 집은 옆에 나무(2그루까지)와 가까운 우물, 붙어 있는 등불을 좋아해요. 밭은 붙어 있는 집이 많을수록, 나무는 물가에 있을수록 좋아요. 우물은 둘레 8칸의 집을, 등불은 붙어 있는 집을 밝혀요. 마지막 조각까지 놓으면 완성이고, 아늑함 점수만큼 별을 받아요. 완성한 마을은 사진으로 저장할 수 있어요. (키보드: 방향키로 칸 이동, 스페이스로 놓기, Z로 무르기)",
    stages: "단계 고르기", full: "전체화면", exitFull: "나가기", mute: "소리 끄기", unmute: "소리 켜기",
  },
  en: {
    stage: "Stage {0}", cosy: "Cosy {0}", goal: "★★ {0} · ★★★ {1}", next: "Next: {0}", start: "Tap any bare land to set a piece down. You can't fail!", done: "Village finished!", result: "{0} cosy points", again: "Build again", nextStage: "Next stage", undo: "Take back one", photo: "Save picture",
    pieces: { house: "House", tree: "Tree", well: "Well", field: "Field", lantern: "Lantern" },
    help: "A little island that fits in your palm. The boat brings the village's pieces one at a time: houses, trees, a well, fields and lanterns. Set each one down on any bare land. You can't fail — every village is a village — but villagers are happier when things sit well together. A house likes trees beside it (up to two), a well nearby and a lantern next to it. A field likes houses next door, a tree likes the water's edge, a well serves the houses in the eight squares round it, and a lantern lights the houses it touches. Once the last piece is down the village is finished, with stars for how cosy it is. Save a picture of your village when you're done. (Keyboard: arrows move, Space places, Z takes back.)",
    stages: "Choose a stage", full: "Fullscreen", exitFull: "Exit", mute: "Mute", unmute: "Unmute",
  },
  ja: {
    stage: "{0}面", cosy: "居心地 {0}", goal: "★★ {0} · ★★★ {1}", next: "次：{0}", start: "空いた土地を押して置こう。失敗はありません！", done: "村が完成！", result: "居心地 {0}点", again: "建て直す", nextStage: "次の面", undo: "1つ戻す", photo: "写真を保存",
    pieces: { house: "家", tree: "木", well: "井戸", field: "畑", lantern: "灯籠" },
    help: "手のひらほどの小さな島です。船が村のパーツを1つずつ運んできます。家・木・井戸・畑・灯籠を好きな空き地に置きましょう。失敗はありません。どう置いても村は村。でも、よく合うように置くと村人がもっと幸せになります。家は隣の木（2本まで）、近くの井戸、隣の灯籠が好き。畑は隣の家が多いほど、木は水辺にあるほどよく、井戸は周り8マスの家を、灯籠は隣の家を照らします。最後のパーツを置けば完成、居心地の点数に応じて星がもらえます。完成した村は写真で保存できます。（キーボード：矢印で移動、スペースで置く、Zで戻す）",
    stages: "ステージ選択", full: "全画面", exitFull: "戻る", mute: "ミュート", unmute: "音を出す",
  },
  zh: {
    stage: "第{0}关", cosy: "温馨度 {0}", goal: "★★ {0} · ★★★ {1}", next: "下一个：{0}", start: "点空地放下一块。不会失败！", done: "村子建好了！", result: "温馨度 {0} 分", again: "重新建", nextStage: "下一关", undo: "收回一个", photo: "保存图片",
    pieces: { house: "房子", tree: "树", well: "水井", field: "田地", lantern: "灯笼" },
    help: "一座只有手掌大的小岛。船一次运来一块村子的部件：房子、树、水井、田地和灯笼，放在任意空地上就好。不会失败——怎么放村子都是村子。但放得相得益彰，村民会更开心：房子喜欢旁边有树（最多2棵）、附近有水井、旁边有灯笼；田地旁边的房子越多越好；树越靠近水边越好；水井照应周围8格的房子，灯笼照亮相邻的房子。放完最后一块就完成了，按温馨度得星。建好的村子可以保存成图片。（键盘：方向键移动，空格放置，Z收回）",
    stages: "选择关卡", full: "全屏", exitFull: "退出", mute: "静音", unmute: "开启声音",
  },
  fr: {
    stage: "Niveau {0}", cosy: "Douceur {0}", goal: "★★ {0} · ★★★ {1}", next: "Suivant : {0}", start: "Touchez une terre libre pour poser une pièce. Impossible d'échouer !", done: "Village terminé !", result: "{0} points de douceur", again: "Rebâtir", nextStage: "Niveau suivant", undo: "Reprendre", photo: "Enregistrer l'image",
    pieces: { house: "Maison", tree: "Arbre", well: "Puits", field: "Champ", lantern: "Lanterne" },
    help: "Une petite île qui tient dans la paume. Le bateau apporte les pièces du village une à une : maisons, arbres, puits, champs et lanternes. Posez chacune sur une terre libre. Impossible d'échouer — tout village est un village — mais les habitants sont plus heureux quand tout s'accorde. Une maison aime des arbres à côté (deux au plus), un puits tout près et une lanterne contre elle. Un champ aime les maisons voisines, un arbre le bord de l'eau, un puits sert les maisons des huit cases autour, une lanterne éclaire les maisons qu'elle touche. La dernière pièce posée, le village est fini, avec des étoiles selon sa douceur. Enregistrez une image de votre village. (Clavier : flèches pour bouger, Espace pour poser, Z pour reprendre.)",
    stages: "Choisir un niveau", full: "Plein écran", exitFull: "Quitter", mute: "Couper le son", unmute: "Activer le son",
  },
  es: {
    stage: "Nivel {0}", cosy: "Acogedor {0}", goal: "★★ {0} · ★★★ {1}", next: "Siguiente: {0}", start: "Toca tierra libre para colocar una pieza. ¡No se puede perder!", done: "¡Pueblo terminado!", result: "{0} puntos de acogida", again: "Construir otra vez", nextStage: "Siguiente nivel", undo: "Deshacer una", photo: "Guardar imagen",
    pieces: { house: "Casa", tree: "Árbol", well: "Pozo", field: "Huerto", lantern: "Farol" },
    help: "Una isla pequeñita que cabe en la palma de la mano. El barco trae las piezas del pueblo una a una: casas, árboles, un pozo, huertos y faroles. Coloca cada una en tierra libre. No se puede perder —todo pueblo es un pueblo—, pero los vecinos son más felices cuando todo encaja. A una casa le gustan árboles al lado (hasta dos), un pozo cerca y un farol pegado. Un huerto quiere casas al lado, un árbol la orilla del agua, un pozo sirve a las casas de las ocho casillas de alrededor y un farol ilumina las casas que toca. Con la última pieza el pueblo está terminado, con estrellas según lo acogedor que sea. Guarda una imagen de tu pueblo. (Teclado: flechas para moverte, Espacio para colocar, Z para deshacer.)",
    stages: "Elegir nivel", full: "Pantalla completa", exitFull: "Salir", mute: "Silenciar", unmute: "Activar sonido",
  },
};

function fill(text: string, ...args: Array<string | number>): string {
  return text.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
}

const MUTE_KEY = "oiyo:palm-village:muted";
const W = 360;
const H = 560;
const GRID_TOP = 90;
const GRID = 330;
const ART: Record<Piece, PixelArt> = {
  house: { palette: { r: "#c92a2a", w: "#fff4e6", b: "#8c6a43", y: "#ffd43b" }, rows: ["...rr...", "..rrrr..", ".rrrrrr.", "rrrrrrrr", ".wwwwww.", ".wybbyw.", ".wwbbww."] },
  tree: { palette: { g: "#2f9e44", l: "#69db7c", b: "#8c6a43" }, rows: ["..gg..", ".glgg.", "gglggg", "gggggg", ".gggg.", "..bb..", "..bb.."] },
  well: { palette: { s: "#868e96", b: "#1971c2", r: "#8c6a43" }, rows: ["rrrrrr", "r....r", "r....r", "ssssss", "sbbbbs", "ssssss"] },
  field: { palette: { y: "#fab005", b: "#8c6a43", g: "#94d82d" }, rows: ["gygygy", "bbbbbb", "ygygyg", "bbbbbb", "gygygy"] },
  lantern: { palette: { k: "#343a40", o: "#ff922b", y: "#ffe066" }, rows: ["..k..", ".kkk.", ".oyo.", ".oyo.", ".kkk.", "..k..", "..k.."] },
};

function geometry(cols: number, rows: number) {
  const cell = Math.floor(GRID / Math.max(cols, rows));
  return { cell, x0: Math.floor((W - cell * cols) / 2), y0: GRID_TOP + Math.floor((GRID - cell * rows) / 2) };
}

export default function PalmVillage({ locale: pageLocale }: { locale?: string }) {
  const locale = normalizeGameLocale(pageLocale) as L;
  const c = COPY[locale] ?? COPY.en;
  const { isImmersive, containerRef, togglePortal } = useArcadePortal({ locale: locale as Locale });

  const [stage, setStage] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState<null | { stars: number; score: number }>(null);
  const [touched, setTouched] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vRef = useRef<Village>(newVillage(VILLAGE_STAGES[0]));
  const input = useRef<Array<{ kind: "cell"; cell: number } | { kind: "undo" } | { kind: "move"; dx: number; dy: number } | { kind: "here" }>>([]);
  const cursor = useRef(-1);
  const parts = useRef<PixelParticle[]>([]);
  const cues = useRef<CuePlayer<CoreCue> | null>(null);
  const haptics = useRef<Haptics | null>(null);
  const copyRef = useRef(c);
  copyRef.current = c;
  const st = VILLAGE_STAGES[stage];

  useRunRecord(VILLAGE_SLUG, Boolean(over), over?.stars ?? 0, "score", `stage-${stage + 1}`);

  const sfx = useCallback((cue: CoreCue) => {
    cues.current?.play(cue);
    const h: Record<CoreCue, Parameters<Haptics["fire"]>[0]> = { tap: "tap", place: "place", success: "success", fail: "fail", combo: "combo", win: "win", lose: "fail" };
    haptics.current?.fire(h[cue]);
  }, []);

  const start = useCallback((s: number) => {
    setStage(s);
    vRef.current = newVillage(VILLAGE_STAGES[s]);
    input.current = [];
    cursor.current = -1;
    parts.current = [];
    setOver(null);
    setTouched(false);
    setCanUndo(false);
  }, []);

  useEffect(() => {
    const doneStages = loadClearedStages(VILLAGE_SLUG, STAGE_COUNT);
    setCleared(doneStages);
    start(nextOpenStage(doneStages, STAGE_COUNT));
    const mu = readMutedPref(MUTE_KEY);
    setMuted(mu);
    cues.current = createCuePlayer({ cues: RETRO_8BIT_CUES, muted: mu });
    haptics.current = createHaptics({ enabled: readHapticsEnabled() });
    return () => cues.current?.close();
  }, [start]);

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (ev.key in moves) {
        ev.preventDefault();
        input.current.push({ kind: "move", dx: moves[ev.key][0], dy: moves[ev.key][1] });
        setTouched(true);
      } else if (ev.key === " ") {
        ev.preventDefault();
        input.current.push({ kind: "here" });
      } else if (ev.key === "z" || ev.key === "Z") input.current.push({ kind: "undo" });
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const v = vRef.current;
      const s = v.stage;
      const cp = copyRef.current;
      const g = geometry(s.cols, s.rows);
      // input is read once per frame
      for (const e of input.current.splice(0)) {
        if (e.kind === "undo") {
          if (undo(v)) sfx("tap");
        } else if (e.kind === "move") {
          const cur = cursor.current < 0 ? Math.floor(s.rows / 2) * s.cols + Math.floor(s.cols / 2) : cursor.current;
          const x = Math.max(0, Math.min(s.cols - 1, (cur % s.cols) + e.dx));
          const y = Math.max(0, Math.min(s.rows - 1, Math.floor(cur / s.cols) + e.dy));
          cursor.current = y * s.cols + x;
        } else {
          const cell = e.kind === "here" ? cursor.current : e.cell;
          if (cell < 0) continue;
          const before = score(v);
          if (place(v, cell)) {
            const gain = score(v) - before;
            const x = g.x0 + ((cell % s.cols) + 0.5) * g.cell;
            const y = g.y0 + (Math.floor(cell / s.cols) + 0.5) * g.cell;
            spawnBurst(parts.current, x, y, gain > 0 ? ["#ffd43b", "#ff8787", "#fff"] : ["#d8c3a5"], gain > 0 ? 6 + gain * 3 : 4, 60, 2);
            sfx(gain >= 3 ? "combo" : gain > 0 ? "success" : "place");
            if (v.over) {
              setOver({ stars: starsFor(v), score: score(v) });
              setCleared(markStageCleared(VILLAGE_SLUG, s.stage, STAGE_COUNT));
              sfx("win");
            }
          }
        }
        setCanUndo(!v.over && v.history.length > 0);
      }
      stepParticles(parts.current, dt, 30);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // the sea, then the island tile by tile
        ctx.fillStyle = "#74c0fc";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#a5d8ff";
        for (let k = 0; k < 18; k++) ctx.fillRect((k * 71 + Math.floor(now / 90)) % W, 40 + ((k * 97) % 500), 10, 2);
        for (let i = 0; i < s.ground.length; i++) {
          const x = g.x0 + (i % s.cols) * g.cell;
          const y = g.y0 + Math.floor(i / s.cols) * g.cell;
          if (s.ground[i] === "water") continue;
          ctx.fillStyle = "#e9d8a6";
          ctx.fillRect(x, y + g.cell - 4, g.cell, 6);
          ctx.fillStyle = s.ground[i] === "rock" ? "#868e96" : (i + Math.floor(i / s.cols)) % 2 ? "#8ce99a" : "#b2f2bb";
          ctx.fillRect(x, y, g.cell, g.cell - 2);
          if (s.ground[i] === "rock") {
            ctx.fillStyle = "#495057";
            ctx.fillRect(x + g.cell * 0.25, y + g.cell * 0.3, g.cell * 0.5, g.cell * 0.4);
          }
          const p = v.placed[i];
          if (p) {
            drawSprite(ctx, ART[p], x + g.cell / 2, y + g.cell / 2, { scale: Math.max(2, Math.floor(g.cell / 9)) });
            const pts = pieceScore(s, v.placed, i);
            if (pts > 0) {
              ctx.fillStyle = "#e03131";
              ctx.font = "bold 10px sans-serif";
              ctx.textAlign = "right";
              ctx.fillText("♥".repeat(Math.min(pts, 4)), x + g.cell - 2, y + 11);
            }
          }
          if (i === cursor.current) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, g.cell - 4, g.cell - 4);
          }
        }
        drawParticles(ctx, parts.current);
        // what the boat brings next
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(10, 440, W - 20, 100);
        ctx.textAlign = "left";
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#1c3d5a";
        const now0 = piece(v);
        ctx.fillText(now0 ? fill(cp.next, cp.pieces[now0]) : cp.done, 22, 462);
        for (let k = 0; k < 4; k++) {
          const p = s.pieces[v.next + k];
          if (!p) break;
          const bx = 40 + k * 78;
          ctx.fillStyle = k === 0 ? "#ffe066" : "rgba(28,61,90,0.08)";
          ctx.fillRect(bx - 28, 472, 56, 56);
          drawSprite(ctx, ART[p], bx, 500, { scale: k === 0 ? 5 : 4 });
        }
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0, 0, W, 70);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(fill(cp.cosy, score(v)), 14, 30);
        ctx.font = "13px sans-serif";
        ctx.fillText(fill(cp.goal, s.good, s.great), 14, 54);
        ctx.textAlign = "right";
        ctx.fillText(`${v.next}/${s.pieces.length}`, W - 14, 30);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sfx]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = vRef.current;
    if (v.over) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    const g = geometry(v.stage.cols, v.stage.rows);
    const col = Math.floor((x - g.x0) / g.cell);
    const row = Math.floor((y - g.y0) / g.cell);
    setTouched(true);
    if (col >= 0 && row >= 0 && col < v.stage.cols && row < v.stage.rows) {
      const cell = row * v.stage.cols + col;
      cursor.current = cell;
      if (canPlace(v, cell)) input.current.push({ kind: "cell", cell });
    }
  };

  const savePicture = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = `palm-village-${stage + 1}.png`;
    a.click();
  };

  const toggleMute = () => {
    const nx = !muted;
    setMuted(nx);
    cues.current?.setMuted(nx);
    writeMutedPref(MUTE_KEY, nx);
  };

  return (
    <div
      ref={containerRef}
      data-game="palm-village"
      className={isImmersive ? "arcade-shell fixed inset-0 z-50 flex h-dvh w-screen flex-col gap-2 overflow-y-auto overscroll-none bg-background p-3" : "mx-auto w-full max-w-md space-y-2"}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{fill(c.stage, stage + 1)}</Badge>
        <Badge variant="outline">{fill(c.goal, st.good, st.great)}</Badge>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" className="size-11" onClick={() => start(stage)} aria-label={c.again}>
            <RotateCcw className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={toggleMute} aria-label={muted ? c.unmute : c.mute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="size-11" onClick={togglePortal} aria-label={isImmersive ? c.exitFull : c.full}>
            {isImmersive ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onDown}
          className="pixelated mx-auto block h-auto w-full max-w-sm touch-none select-none rounded-2xl border-4 border-border"
          aria-label={c.help}
        />
        {!touched && !over ? (
          <div className="pointer-events-none absolute inset-x-4 top-20 text-center" aria-hidden="true">
            <span className="inline-block rounded-2xl bg-background/85 px-4 py-2 text-base font-bold shadow">{c.start}</span>
          </div>
        ) : null}
        {over ? (
          <div className="absolute inset-x-4 top-1/4 space-y-2 rounded-lg border border-primary/40 bg-background/90 p-3 text-center" role="status">
            <p className="text-lg font-bold">{c.done}</p>
            <p className="text-sm text-muted-foreground">{fill(c.result, over.score)}</p>
            <p className="text-2xl tracking-widest text-warning" aria-label={`${over.stars}/3`}>{"★".repeat(over.stars)}{"☆".repeat(3 - over.stars)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-12" onClick={() => start(stage)}>
                <RotateCcw className="size-4" />
                <span>{c.again}</span>
              </Button>
              <Button className="min-h-12" onClick={() => start(stage >= STAGE_COUNT - 1 ? 0 : stage + 1)}>
                <span>{stage >= STAGE_COUNT - 1 ? finaleLabel(locale) : c.nextStage}</span>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="min-h-12" disabled={!canUndo} onClick={() => input.current.push({ kind: "undo" })}>
          <Undo2 className="size-4" />
          <span>{c.undo}</span>
        </Button>
        <Button variant="secondary" className="min-h-12" onClick={savePicture}>
          <Camera className="size-4" />
          <span>{c.photo}</span>
        </Button>
      </div>
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
